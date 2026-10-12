// The Razorpay webhook. This is the ONLY authority for marking a
// booking paid.
//
// Three things make this route different from every other one:
//
//   1. The signature is verified against the RAW body. The body is read
//      with request.text() and only parsed afterwards. Parsing first and
//      re-stringifying changes the bytes and the signature never
//      matches.
//   2. Nothing is trusted until that signature passes. An unverified
//      request is logged and dropped.
//   3. It must be idempotent. Razorpay retries, so the same event can
//      arrive several times and must not confirm a booking twice or
//      add seats twice.
//
// It also performs the SECOND availability check. If the trip filled up
// while this customer was paying, the money is refunded automatically
// rather than overselling the coach.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { getDepartureAvailabilityForUpdate } from "@/lib/availability";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        error_description?: string;
      };
    };
  };
};

// Always 200 for anything we have decided not to act on. A non-200 makes
// Razorpay retry, and retrying will not change the answer for an event
// we deliberately ignored.
function acknowledge(reason: string) {
  return NextResponse.json({ received: true, reason }, { status: 200 });
}

export async function POST(request: Request) {
  let bookingRef = "unknown";

  try {
    // RAW body first. Never request.json() before this line.
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!verifyWebhookSignature({ rawBody, signature })) {
      console.error(
        "[webhook] signature verification FAILED. Request dropped. If real payments are also failing, check RAZORPAY_WEBHOOK_SECRET matches the secret set on this webhook in the Razorpay dashboard.",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as RazorpayWebhookEvent;
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    console.log(
      `[webhook] verified event ${event.event ?? "unnamed"} for order ${orderId ?? "none"}`,
    );

    if (!orderId) {
      return acknowledge("no order id on this event");
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        booking: {
          select: {
            id: true,
            bookingRef: true,
            status: true,
            departureId: true,
            travellerCount: true,
          },
        },
      },
    });

    if (!payment) {
      console.warn(
        `[webhook] no payment row for order ${orderId}. Either this webhook is pointed at the wrong environment, or the order was created by a different deployment.`,
      );
      return acknowledge("unknown order");
    }

    bookingRef = payment.booking.bookingRef;

    if (event.event === "payment.failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          razorpayPaymentId: paymentEntity?.id ?? null,
          failureReason: paymentEntity?.error_description ?? "Payment failed",
          rawPayload: JSON.parse(rawBody),
        },
      });
      console.log(
        `[webhook] ${bookingRef} payment failed: ${paymentEntity?.error_description ?? "no reason given"}. Seats stay held until the hold expires.`,
      );
      return acknowledge("payment failed recorded");
    }

    if (event.event !== "payment.captured") {
      return acknowledge(`event ${event.event} not handled`);
    }

    // Idempotency. A retry of an event we already acted on must change
    // nothing at all.
    if (payment.status === "paid" || payment.booking.status === "confirmed") {
      console.log(`[webhook] ${bookingRef} already confirmed, ignoring retry`);
      return acknowledge("already confirmed");
    }
    if (payment.status === "refunded" || payment.booking.status === "refunded") {
      console.log(`[webhook] ${bookingRef} already refunded, ignoring retry`);
      return acknowledge("already refunded");
    }

    // Defence in depth. Razorpay will not capture a different amount for
    // an order we created, but if the figures ever disagree we want to
    // know before the seats are given away.
    const expectedPaise = rupeesToPaise(payment.amount);
    if (typeof paymentEntity?.amount === "number" && paymentEntity.amount !== expectedPaise) {
      console.error(
        `[webhook] ${bookingRef} AMOUNT MISMATCH: expected ${expectedPaise} paise, Razorpay captured ${paymentEntity.amount}. Not confirming. Check this booking by hand.`,
      );
      return acknowledge("amount mismatch, needs manual review");
    }

    const paidRupees =
      typeof paymentEntity?.amount === "number"
        ? paiseToRupees(paymentEntity.amount)
        : payment.amount;

    // SECOND availability check, under a row lock. The first was when
    // the order was created, which may have been fifteen minutes ago.
    const outcome = await prisma.$transaction(async (tx) => {
      const availability = await getDepartureAvailabilityForUpdate(
        tx,
        payment.booking.departureId,
        // This booking's own hold must not count against itself.
        payment.booking.id,
      );

      if (!availability) {
        return { kind: "departure_missing" as const };
      }

      const seatsAfterConfirming =
        availability.seatsConfirmed +
        availability.seatsOnHold +
        payment.booking.travellerCount;

      if (seatsAfterConfirming > availability.totalSeats) {
        return {
          kind: "oversold" as const,
          wanted: payment.booking.travellerCount,
          wouldBe: seatsAfterConfirming,
          capacity: availability.totalSeats,
        };
      }

      await tx.booking.update({
        where: { id: payment.booking.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          amountPaid: { increment: paidRupees },
        },
      });

      await tx.departure.update({
        where: { id: payment.booking.departureId },
        data: { seatsConfirmed: { increment: payment.booking.travellerCount } },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          razorpayPaymentId: paymentEntity?.id ?? null,
          rawPayload: JSON.parse(rawBody),
        },
      });

      return { kind: "confirmed" as const };
    });

    if (outcome.kind === "confirmed") {
      console.log(
        `[webhook] ${bookingRef} CONFIRMED. ${payment.booking.travellerCount} seat(s), ${paidRupees} rupees received.`,
      );
      return acknowledge("confirmed");
    }

    if (outcome.kind === "departure_missing") {
      console.error(
        `[webhook] ${bookingRef} departure ${payment.booking.departureId} has vanished. Payment taken and NOT confirmed. Refund by hand.`,
      );
      return acknowledge("departure missing, needs manual refund");
    }

    // Oversold. Somebody else took the last seats while this customer
    // was paying. Give the money back rather than put two women on one
    // seat, and record the refund id so it can be reconciled against the
    // Razorpay dashboard.
    console.error(
      `[webhook] ${bookingRef} OVERSOLD: confirming would make ${outcome.wouldBe} seats against a capacity of ${outcome.capacity}. Refunding ${paidRupees} rupees automatically.`,
    );

    const paymentIdToRefund = paymentEntity?.id;
    if (!paymentIdToRefund) {
      console.error(
        `[webhook] ${bookingRef} cannot refund: the event carried no payment id. Refund by hand from the Razorpay dashboard.`,
      );
      return acknowledge("oversold, manual refund needed");
    }

    const refund = await getRazorpay().payments.refund(paymentIdToRefund, {
      amount: rupeesToPaise(paidRupees),
      speed: "normal",
      notes: { bookingRef, reason: "Trip filled up while payment was in progress" },
    });

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "refunded",
          razorpayPaymentId: paymentIdToRefund,
          razorpayRefundId: refund.id,
          refundedAmount: paidRupees,
          refundedAt: new Date(),
          rawPayload: JSON.parse(rawBody),
        },
      }),
      prisma.booking.update({
        where: { id: payment.booking.id },
        data: {
          status: "refunded",
          cancelledAt: new Date(),
          adminNotes:
            "Automatically refunded: the trip filled up while this payment was in progress.",
        },
      }),
    ]);

    console.log(
      `[webhook] ${bookingRef} REFUNDED ${paidRupees} rupees, refund id ${refund.id}. Call this customer.`,
    );
    return acknowledge("oversold, refunded");
  } catch (error) {
    console.error(`[webhook] ${bookingRef} handler failed:`, error);
    // A 500 makes Razorpay retry, which is what we want for a genuine
    // transient failure such as the database being briefly unreachable.
    return NextResponse.json(
      { error: "Webhook handling failed" },
      { status: 500 },
    );
  }
}
