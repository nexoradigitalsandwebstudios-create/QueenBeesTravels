// Fires a correctly signed webhook at your local server, standing in
// for the one Razorpay sends after a real payment.
//
//     npm run webhook:simulate -- QB-7F3K2M
//
// Why this exists: Razorpay cannot reach localhost, so during local
// development no webhook ever arrives, and without one nothing confirms
// a booking. Rather than weaken the server with a development-only
// confirm path, which is exactly the kind of thing that ships by
// accident, this sends the real event with a real signature.
//
// It signs with the same RAZORPAY_WEBHOOK_SECRET the route verifies
// with, so it works even while that value is still a placeholder: both
// sides only have to agree with each other.
//
// Use it after paying with a Razorpay test card in the browser, to
// complete the flow exactly as production would.

import "dotenv/config";
import crypto from "node:crypto";

import { prisma } from "../lib/prisma";

const BASE_URL = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

async function main() {
  const bookingRef = process.argv[2];

  if (!bookingRef) {
    console.error(
      "Usage: npm run webhook:simulate -- <bookingRef>\nExample: npm run webhook:simulate -- QB-7F3K2M",
    );
    process.exit(1);
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set, so nothing can be signed.");
    process.exit(1);
  }

  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });

  if (!booking) {
    console.error(`No booking with reference ${bookingRef}.`);
    process.exit(1);
  }

  const payment = booking.payments[0];
  if (!payment?.razorpayOrderId) {
    console.error(
      `Booking ${bookingRef} has no Razorpay order, so there is nothing to confirm. It was probably cancelled before the order was created.`,
    );
    process.exit(1);
  }

  console.log(`booking ${bookingRef} is currently ${booking.status}`);
  console.log(`order ${payment.razorpayOrderId}, advance ${payment.amount} rupees`);

  // The amount must match what the route expects, or it refuses to
  // confirm and asks for a human. That check is deliberate.
  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: payment.razorpayPaymentId ?? `pay_simulated_${Date.now()}`,
          order_id: payment.razorpayOrderId,
          amount: payment.amount * 100,
        },
      },
    },
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const response = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
    },
    body,
  });

  const result = await response.json();
  console.log(`\nwebhook responded ${response.status}: ${JSON.stringify(result)}`);

  const after = await prisma.booking.findUniqueOrThrow({
    where: { bookingRef },
  });
  console.log(`booking ${bookingRef} is now ${after.status}`);
  if (after.status === "confirmed") {
    console.log(`amountPaid ${after.amountPaid} rupees, confirmed at ${after.confirmedAt?.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
