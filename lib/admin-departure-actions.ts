"use server";

// Server actions for departures: the dates, prices and seat counts.
//
// This file touches money and seats, so it is the most dangerous admin
// code in the project. Two rules it will not bend:
//
//   A departure with bookings cannot be deleted. Those are somebody's
//   seats and somebody's money.
//
//   seatsConfirmed is never edited here. It is maintained by the
//   webhook when a payment is confirmed. Letting it be typed in would
//   let a stray keystroke oversell a coach.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/admin-trip-actions";

const departureSchema = z
  .object({
    id: z.string().optional(),
    tripId: z.string().min(1),
    startDate: z.string().min(1, "Pick a start date"),
    endDate: z.string().min(1, "Pick an end date"),
    // Whole rupees. Rule 7: paise appear only at the Razorpay boundary.
    pricePerPerson: z.coerce.number().int().min(0).max(10_000_000),
    advanceAmount: z.coerce.number().int().min(0).max(10_000_000),
    totalSeats: z.coerce.number().int().min(1).max(200),
    status: z.enum(["open", "closed", "cancelled", "completed"]),
  })
  .refine((value) => value.advanceAmount <= value.pricePerPerson, {
    message: "The advance cannot be more than the price per person",
    path: ["advanceAmount"],
  })
  .refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
    message: "The return date cannot be before the start date",
    path: ["endDate"],
  });

// A date input gives "2026-11-14". Parsing it as UTC midnight keeps it
// the same calendar day everywhere, which matters because the public
// pages format dates in Asia/Kolkata.
function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function saveDeparture(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = departureSchema.safeParse({
      id: formData.get("id") || undefined,
      tripId: formData.get("tripId"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      pricePerPerson: formData.get("pricePerPerson"),
      advanceAmount: formData.get("advanceAmount"),
      totalSeats: formData.get("totalSeats"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first.message };
    }

    const input = parsed.data;

    const data = {
      startDate: parseDateOnly(input.startDate),
      endDate: parseDateOnly(input.endDate),
      pricePerPerson: input.pricePerPerson,
      advanceAmount: input.advanceAmount,
      totalSeats: input.totalSeats,
      status: input.status,
    };

    if (input.id) {
      // Reducing capacity below what is already sold would show negative
      // seats on the public page and let the next booking oversell.
      const existing = await prisma.departure.findUnique({
        where: { id: input.id },
        select: { seatsConfirmed: true },
      });

      if (existing && input.totalSeats < existing.seatsConfirmed) {
        return {
          ok: false,
          error: `This date already has ${existing.seatsConfirmed} confirmed seats, so the total cannot be set below that.`,
        };
      }

      await prisma.departure.update({ where: { id: input.id }, data });
      console.log(`[admin] updated departure ${input.id}`);
    } else {
      await prisma.departure.create({ data: { ...data, tripId: input.tripId } });
      console.log(`[admin] created departure for trip ${input.tripId}`);
    }

    revalidatePath("/admin/trips");
    revalidatePath("/trips");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveDeparture failed:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "This trip already has a departure starting on that date."
        : "We could not save that date.";
    return { ok: false, error: message };
  }
}

export async function deleteDeparture(
  departureId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const bookingCount = await prisma.booking.count({ where: { departureId } });

    if (bookingCount > 0) {
      return {
        ok: false,
        error: `This date has ${bookingCount} booking${bookingCount === 1 ? "" : "s"} against it and cannot be deleted. Set it to cancelled instead, then call those travellers.`,
      };
    }

    await prisma.waitlistEntry.deleteMany({ where: { departureId } });
    await prisma.departure.delete({ where: { id: departureId } });
    console.log(`[admin] deleted departure ${departureId}`);

    revalidatePath("/admin/trips");
    revalidatePath("/trips");
    return { ok: true };
  } catch (error) {
    console.error("[admin] deleteDeparture failed:", error);
    return { ok: false, error: "We could not delete that date." };
  }
}
