// Joining the waitlist for a departure that is full.
//
// No money, no seat hold. This records that somebody wants a seat so the
// client can ring them when one opens up or when another date is added.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const waitlistRequestSchema = z.object({
  departureId: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?91[\s-]?)?[6-9]\d{9}$/, "Enter a 10 digit mobile number"),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  seatsWanted: z.coerce.number().int().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const parsed = waitlistRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please check the details and try again.",
          issues:
            process.env.NODE_ENV !== "production"
              ? parsed.error.issues
              : undefined,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const departure = await prisma.departure.findUnique({
      where: { id: input.departureId },
      select: { id: true },
    });

    if (!departure) {
      console.warn(`[waitlist] departure not found: ${input.departureId}`);
      return NextResponse.json(
        { error: "That trip date is no longer available." },
        { status: 404 },
      );
    }

    // The schema has a unique constraint on departure and phone, so a
    // second tap updates the existing entry rather than creating a
    // duplicate that gets called twice.
    await prisma.waitlistEntry.upsert({
      where: {
        departureId_phone: {
          departureId: input.departureId,
          phone: input.phone,
        },
      },
      update: {
        name: input.name,
        email: input.email ? input.email : null,
        seatsWanted: input.seatsWanted,
      },
      create: {
        departureId: input.departureId,
        name: input.name,
        phone: input.phone,
        email: input.email ? input.email : null,
        seatsWanted: input.seatsWanted,
      },
    });

    console.log(
      `[waitlist] departure ${input.departureId}: added a request for ${input.seatsWanted} seat(s)`,
    );

    return NextResponse.json({ joined: true });
  } catch (error) {
    console.error("[waitlist] failed:", error);
    return NextResponse.json(
      { error: "We could not add you to the waitlist. Please try again." },
      { status: 500 },
    );
  }
}
