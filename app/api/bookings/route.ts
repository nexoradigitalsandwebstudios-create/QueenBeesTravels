// Creates a pending booking and a Razorpay order.
//
// THE AMOUNT IS NEVER READ FROM THE REQUEST. The client sends a
// departure id and a number of travellers, nothing else about money.
// The price is looked up from the Departure row and multiplied here. A
// client-supplied amount is an exploit, so the schema below does not
// even have a field for one: an amount in the body is silently dropped
// rather than trusted.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRazorpay, getRazorpayPublicKeyId } from "@/lib/razorpay";
import { rupeesToPaise } from "@/lib/money";
import { computeBookingCharge } from "@/lib/booking-pricing";
import { generateBookingReference } from "@/lib/booking-reference";
import {
  getDepartureAvailabilityForUpdate,
  seatHoldExpiresAt,
} from "@/lib/availability";
import { SEAT_HOLD_MINUTES } from "@/lib/constants";

const MAX_TRAVELLERS_PER_BOOKING = 10;

const bookingRequestSchema = z.object({
  departureId: z.string().min(1, "departureId is required"),
  customerName: z.string().trim().min(2, "Please enter your name").max(120),
  // Indian mobile numbers, with or without +91. Kept deliberately loose:
  // rejecting a real customer's number is more expensive than accepting
  // an odd one the client can ring and check.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?91[\s-]?)?[6-9]\d{9}$/, "Enter a 10 digit mobile number"),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  travellerCount: z.coerce
    .number()
    .int()
    .min(1, "At least one traveller")
    .max(MAX_TRAVELLERS_PER_BOOKING),
  travellerNames: z.array(z.string().trim().min(1)).max(
    MAX_TRAVELLERS_PER_BOOKING,
  ),
  specialRequests: z.string().trim().max(1000).optional(),
});

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  let bookingRef = "unassigned";

  try {
    const body = await request.json();
    const parsed = bookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn("[booking] validation failed:", parsed.error.issues);
      return NextResponse.json(
        {
          error: "Please check the details and try again.",
          // Validation detail only in development. In production it
          // would tell an attacker the exact shape of the API.
          issues: isDevelopment() ? parsed.error.issues : undefined,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (input.travellerNames.length > input.travellerCount) {
      return NextResponse.json(
        { error: "More traveller names than travellers." },
        { status: 400 },
      );
    }

    // Everything that decides money or seats happens inside one
    // transaction with the departure row locked. Two people asking for
    // the last two seats at the same moment both read the same number
    // without this, and both get a booking.
    const created = await prisma.$transaction(async (tx) => {
      const availability = await getDepartureAvailabilityForUpdate(
        tx,
        input.departureId,
      );

      if (!availability) {
        return { kind: "not_found" as const };
      }

      const departure = await tx.departure.findUniqueOrThrow({
        where: { id: input.departureId },
        select: {
          id: true,
          status: true,
          startDate: true,
          pricePerPerson: true,
          advanceAmount: true,
          trip: { select: { title: true } },
        },
      });

      if (departure.status !== "open") {
        return { kind: "closed" as const };
      }

      if (departure.startDate <= new Date()) {
        return { kind: "departed" as const };
      }

      if (availability.availableSeats < input.travellerCount) {
        return {
          kind: "not_enough_seats" as const,
          availableSeats: availability.availableSeats,
        };
      }

      // RULE 1. Both figures come from the database row, never from the
      // request. RULE 7: whole rupees here, paise only at the Razorpay
      // call below. See lib/booking-pricing.ts.
      const { totalAmount, advanceDue } = computeBookingCharge({
        pricePerPerson: departure.pricePerPerson,
        advanceAmount: departure.advanceAmount,
        travellerCount: input.travellerCount,
      });

      const booking = await tx.booking.create({
        data: {
          bookingRef: generateBookingReference(),
          departureId: departure.id,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email ? input.email : null,
          travellerCount: input.travellerCount,
          travellerNames: input.travellerNames,
          specialRequests: input.specialRequests ?? null,
          totalAmount,
          amountPaid: 0,
          status: "pending",
          expiresAt: seatHoldExpiresAt(),
        },
        select: { id: true, bookingRef: true, expiresAt: true },
      });

      return {
        kind: "created" as const,
        booking,
        advanceDue,
        totalAmount,
        tripTitle: departure.trip.title,
      };
    });

    if (created.kind === "not_found") {
      console.warn(`[booking] departure not found: ${input.departureId}`);
      return NextResponse.json(
        { error: "That trip date is no longer available." },
        { status: 404 },
      );
    }

    if (created.kind === "closed" || created.kind === "departed") {
      console.warn(
        `[booking] departure ${input.departureId} rejected because it is ${created.kind}`,
      );
      return NextResponse.json(
        { error: "That trip date is no longer open for booking." },
        { status: 409 },
      );
    }

    if (created.kind === "not_enough_seats") {
      console.warn(
        `[booking] departure ${input.departureId}: wanted ${input.travellerCount}, only ${created.availableSeats} left`,
      );
      return NextResponse.json(
        {
          error:
            created.availableSeats === 0
              ? "This date just sold out. Join the waitlist and we will call you if a seat opens."
              : `Only ${created.availableSeats} seat${created.availableSeats === 1 ? "" : "s"} left on this date.`,
          availableSeats: created.availableSeats,
        },
        { status: 409 },
      );
    }

    bookingRef = created.booking.bookingRef;
    console.log(
      `[booking] ${bookingRef} held ${input.travellerCount} seat(s) on departure ${input.departureId} for ${SEAT_HOLD_MINUTES} minutes, advance due ${created.advanceDue} rupees`,
    );

    // The Razorpay call is outside the transaction on purpose. It is a
    // network round trip to another company, and holding a row lock
    // across it would block every other booking on this departure for
    // as long as Razorpay takes to answer.
    //
    // If it fails, the booking above is already holding seats with no
    // way for anyone to pay for them. Releasing those seats immediately
    // is better than making the next customer wait out the full hold
    // for a booking that can never complete.
    let order;
    try {
      order = await getRazorpay().orders.create({
        amount: rupeesToPaise(created.advanceDue),
        currency: "INR",
        receipt: bookingRef,
        notes: {
          bookingRef,
          trip: created.tripTitle,
          travellers: String(input.travellerCount),
        },
      });
    } catch (orderError) {
      await prisma.booking.update({
        where: { id: created.booking.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          adminNotes:
            "Cancelled automatically: Razorpay would not create an order, so the customer was never able to pay. Seats released.",
        },
      });
      console.error(
        `[booking] ${bookingRef} razorpay order creation failed, seats released:`,
        orderError,
      );
      return NextResponse.json(
        { error: "We could not reach the payment provider. Please try again." },
        { status: 502 },
      );
    }

    await prisma.payment.create({
      data: {
        bookingId: created.booking.id,
        amount: created.advanceDue,
        status: "created",
        razorpayOrderId: order.id,
      },
    });

    console.log(
      `[booking] ${bookingRef} razorpay order created: ${order.id} for ${created.advanceDue} rupees`,
    );

    return NextResponse.json({
      bookingRef,
      razorpayOrderId: order.id,
      // Safe to send: the key id is public and the checkout script in
      // the browser needs it. The key SECRET never leaves the server.
      razorpayKeyId: getRazorpayPublicKeyId(),
      amountDueRupees: created.advanceDue,
      totalAmountRupees: created.totalAmount,
      expiresAt: created.booking.expiresAt.toISOString(),
    });
  } catch (error) {
    // The real error goes to the server log with the reference, so one
    // booking can be traced through the whole flow. The customer gets a
    // sentence that gives an attacker nothing.
    console.error(`[booking] ${bookingRef} failed:`, error);
    return NextResponse.json(
      { error: "We could not start this booking. Please try again." },
      { status: 500 },
    );
  }
}
