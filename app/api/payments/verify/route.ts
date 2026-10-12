// Verifies the signature the BROWSER hands back when the Razorpay
// checkout sheet closes.
//
// This route deliberately does NOT confirm a booking, does not touch
// seatsConfirmed and does not mark anything paid. Everything it is told
// comes from a browser, and a browser can be lied to or scripted. The
// webhook is the only authority.
//
// What it is for: telling the customer honestly whether their payment
// went through, and recording the payment id early so support can find
// the payment if the webhook is delayed.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyCheckoutSignature } from "@/lib/razorpay-signature";

const verifyRequestSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: Request) {
  let bookingRef = "unknown";

  try {
    const parsed = verifyRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      console.warn("[verify] malformed request:", parsed.error.issues);
      return NextResponse.json(
        {
          error: "Missing payment details.",
          issues:
            process.env.NODE_ENV !== "production"
              ? parsed.error.issues
              : undefined,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { booking: { select: { bookingRef: true } } },
    });

    if (!payment) {
      console.warn(`[verify] no payment row for order ${input.razorpayOrderId}`);
      return NextResponse.json(
        { error: "We could not find that payment." },
        { status: 404 },
      );
    }

    bookingRef = payment.booking.bookingRef;

    if (!verifyCheckoutSignature(input)) {
      console.error(
        `[verify] ${bookingRef} SIGNATURE REJECTED for order ${input.razorpayOrderId}. Somebody posted payment details that Razorpay did not sign.`,
      );
      return NextResponse.json(
        { error: "We could not verify that payment." },
        { status: 400 },
      );
    }

    // Record the payment id only. Status stays whatever the webhook has
    // set, or "created" if the webhook has not arrived yet.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayPaymentId: input.razorpayPaymentId },
    });

    console.log(
      `[verify] ${bookingRef} checkout signature verified, payment ${input.razorpayPaymentId}. Waiting on the webhook to confirm.`,
    );

    return NextResponse.json({ verified: true, bookingRef });
  } catch (error) {
    console.error(`[verify] ${bookingRef} failed:`, error);
    return NextResponse.json(
      { error: "We could not verify that payment." },
      { status: 500 },
    );
  }
}
