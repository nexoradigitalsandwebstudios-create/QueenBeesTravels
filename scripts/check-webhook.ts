// The webhook is the only thing that can mark a booking paid, so these
// checks matter more than any visual test in the project.
//
// Start the dev server first, then:
//
//     npm run check:webhook
//
// It needs no Razorpay account: the signature is computed here with the
// same secret the route reads, so genuine and forged requests can both
// be sent on demand. The automatic refund path is the one thing it
// cannot reach, because refunding calls Razorpay.

import "dotenv/config";
import crypto from "node:crypto";

import { prisma } from "../lib/prisma";
import { getAvailabilityForDepartures } from "../lib/availability";

const BASE_URL = process.env.CHECK_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_URL = `${BASE_URL}/api/webhooks/razorpay`;
const TEST_NAME = "Webhook Check";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

function sign(rawBody: string): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set, cannot sign.");
  }
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function postWebhook(rawBody: string, signature: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== null) {
    headers["x-razorpay-signature"] = signature;
  }
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: rawBody,
  });
  return { status: response.status, json: await response.json() };
}

function capturedEvent(orderId: string, paymentId: string, amountPaise: number) {
  // A single string, sent byte for byte, exactly as Razorpay would.
  return JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise } } },
  });
}

async function cleanup() {
  await prisma.payment.deleteMany({
    where: { booking: { customerName: TEST_NAME } },
  });
  await prisma.booking.deleteMany({ where: { customerName: TEST_NAME } });
}

async function main() {
  await cleanup();

  // The departure must have genuine room, counting unexpired pending
  // holds and not just confirmed seats. Picking merely the soonest open
  // one lands on something other test bookings have already filled, and
  // the webhook then correctly refuses to confirm and tries to refund,
  // which looks like a broken webhook and is the opposite.
  const candidates = await prisma.departure.findMany({
    where: { status: "open", startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });

  const availability = await getAvailabilityForDepartures(
    candidates.map((candidate) => candidate.id),
  );

  const roomy = candidates.find((candidate) => {
    const seats = availability.get(candidate.id);
    return seats !== undefined && seats.availableSeats >= 2;
  });

  if (!roomy) {
    console.log(
      "FAIL  no open departure has 2 free seats. Run: npm run db:reset",
    );
    process.exit(1);
  }

  const departure = await prisma.departure.findUniqueOrThrow({
    where: { id: roomy.id },
  });

  const seatsBefore = departure.seatsConfirmed;
  const travellers = 1;
  const advance = departure.advanceAmount * travellers;
  const orderId = `order_check_${Date.now()}`;
  const paymentId = `pay_check_${Date.now()}`;

  // A pending booking and its payment, created directly, standing in for
  // what the booking route would have made.
  const booking = await prisma.booking.create({
    data: {
      bookingRef: `QB-WH${Date.now().toString().slice(-4)}`,
      departureId: departure.id,
      customerName: TEST_NAME,
      phone: "9000000055",
      travellerCount: travellers,
      travellerNames: [TEST_NAME],
      totalAmount: departure.pricePerPerson * travellers,
      status: "pending",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: advance,
      status: "created",
      razorpayOrderId: orderId,
    },
  });

  console.log(`booking ${booking.bookingRef}, order ${orderId}, advance ${advance}\n`);

  const body = capturedEvent(orderId, paymentId, advance * 100);
  const goodSignature = sign(body);

  // --- 1. Forged and missing signatures --------------------------------
  const noSig = await postWebhook(body, null);
  check("no signature is rejected", noSig.status, 400);

  const wrongSig = await postWebhook(body, "deadbeef".repeat(8));
  check("a forged signature is rejected", wrongSig.status, 400);

  const otherSecret = crypto
    .createHmac("sha256", "not-the-real-secret")
    .update(body)
    .digest("hex");
  check(
    "a signature from the wrong secret is rejected",
    (await postWebhook(body, otherSecret)).status,
    400,
  );

  // Rule 2: the signature covers the RAW bytes. Reformatting the same
  // JSON must fail even though the data is identical.
  const prettyBody = JSON.stringify(JSON.parse(body), null, 2);
  check(
    "a reformatted body fails against the raw-body signature",
    (await postWebhook(prettyBody, goodSignature)).status,
    400,
  );

  const afterForgeries = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  check(
    "no forged request confirmed anything",
    afterForgeries.status,
    "pending",
  );

  // --- 2. An unknown order is acknowledged, not retried forever --------
  const unknownBody = capturedEvent("order_does_not_exist", "pay_x", 100);
  check(
    "an unknown order is acknowledged with 200",
    (await postWebhook(unknownBody, sign(unknownBody))).status,
    200,
  );

  // --- 3. An amount that disagrees is refused --------------------------
  const wrongAmountBody = capturedEvent(orderId, paymentId, advance * 100 + 100);
  const wrongAmount = await postWebhook(wrongAmountBody, sign(wrongAmountBody));
  check("an amount mismatch returns 200", wrongAmount.status, 200);
  check(
    "an amount mismatch does NOT confirm",
    wrongAmount.json.reason,
    "amount mismatch, needs manual review",
  );

  const afterMismatch = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  check("still pending after a mismatch", afterMismatch.status, "pending");

  // --- 4. The genuine event confirms -----------------------------------
  const genuine = await postWebhook(body, goodSignature);
  check("a genuine event is accepted", genuine.status, 200);
  check("it reports confirmed", genuine.json.reason, "confirmed");

  const confirmed = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { payments: true },
  });
  check("booking is confirmed", confirmed.status, "confirmed");
  check("confirmedAt was set", confirmed.confirmedAt !== null, true);
  check("amountPaid is the advance", confirmed.amountPaid, advance);
  check("payment is marked paid", confirmed.payments[0].status, "paid");
  check(
    "the razorpay payment id was recorded",
    confirmed.payments[0].razorpayPaymentId,
    paymentId,
  );

  const departureAfter = await prisma.departure.findUniqueOrThrow({
    where: { id: departure.id },
  });
  check(
    "seatsConfirmed went up by the traveller count",
    departureAfter.seatsConfirmed,
    seatsBefore + travellers,
  );

  // --- 5. Idempotency: Razorpay retries --------------------------------
  const retry = await postWebhook(body, goodSignature);
  check("a retry is accepted", retry.status, 200);
  check("a retry is recognised as already confirmed", retry.json.reason, "already confirmed");

  const departureAfterRetry = await prisma.departure.findUniqueOrThrow({
    where: { id: departure.id },
  });
  check(
    "a retry does NOT add seats a second time",
    departureAfterRetry.seatsConfirmed,
    seatsBefore + travellers,
  );

  const bookingAfterRetry = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  check(
    "a retry does NOT charge the amount twice",
    bookingAfterRetry.amountPaid,
    advance,
  );

  // --- cleanup ---------------------------------------------------------
  await prisma.departure.update({
    where: { id: departure.id },
    data: { seatsConfirmed: seatsBefore },
  });
  await cleanup();

  await prisma.$disconnect();
  console.log(
    failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("failed:", error instanceof Error ? error.message : error);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
