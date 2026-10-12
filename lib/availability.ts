// How many seats are actually left on a departure.
//
// This is the one place that answers that question. The public pages,
// the booking route and the webhook all use these functions, so there is
// only one definition of "available" in the codebase.
//
// Available seats = totalSeats
//                 - seatsConfirmed
//                 - seats held by pending bookings that have not expired
//
// A pending booking holds its seats for SEAT_HOLD_MINUTES while the
// customer pays. Once expiresAt is in the past the hold counts for
// nothing and the seats are available again, with no cleanup job needed.

import { prisma } from "@/lib/prisma";
import { SEAT_HOLD_MINUTES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

export type DepartureAvailability = {
  departureId: string;
  totalSeats: number;
  seatsConfirmed: number;
  // Seats inside unexpired pending bookings. Not paid for yet, but not
  // sellable to anyone else either.
  seatsOnHold: number;
  availableSeats: number;
  isSoldOut: boolean;
};

// The expiry to put on a new pending booking. Call this when creating
// the booking, not when creating the Razorpay order, so the clock starts
// at the moment the seats are actually claimed.
export function seatHoldExpiresAt(): Date {
  return new Date(Date.now() + SEAT_HOLD_MINUTES * 60 * 1000);
}

function buildAvailability(
  departureId: string,
  totalSeats: number,
  seatsConfirmed: number,
  seatsOnHold: number,
): DepartureAvailability {
  // Clamped at zero. If the numbers ever go negative something is wrong
  // upstream, and reporting -2 seats to a customer is worse than
  // reporting none. The negative case is logged below.
  const rawAvailable = totalSeats - seatsConfirmed - seatsOnHold;
  const availableSeats = Math.max(0, rawAvailable);

  if (rawAvailable < 0) {
    console.error(
      `[availability] Departure ${departureId} is oversold: totalSeats=${totalSeats} seatsConfirmed=${seatsConfirmed} seatsOnHold=${seatsOnHold}. Check the bookings for this departure against seatsConfirmed.`,
    );
  }

  return {
    departureId,
    totalSeats,
    seatsConfirmed,
    seatsOnHold,
    availableSeats,
    isSoldOut: availableSeats === 0,
  };
}

// Availability for many departures in two queries instead of two per
// departure. The trip detail page lists every departure for a trip, so
// the per-departure version would be an N+1 query on a page customers
// hit constantly.
export async function getAvailabilityForDepartures(
  departureIds: string[],
): Promise<Map<string, DepartureAvailability>> {
  const availabilityByDepartureId = new Map<string, DepartureAvailability>();

  if (departureIds.length === 0) {
    return availabilityByDepartureId;
  }

  const departures = await prisma.departure.findMany({
    where: { id: { in: departureIds } },
    select: { id: true, totalSeats: true, seatsConfirmed: true },
  });

  const now = new Date();

  const holdsByDepartureId = await prisma.booking.groupBy({
    by: ["departureId"],
    where: {
      departureId: { in: departureIds },
      status: "pending",
      expiresAt: { gt: now },
    },
    _sum: { travellerCount: true },
  });

  const seatsOnHoldByDepartureId = new Map<string, number>();
  for (const group of holdsByDepartureId) {
    seatsOnHoldByDepartureId.set(
      group.departureId,
      group._sum.travellerCount ?? 0,
    );
  }

  for (const departure of departures) {
    availabilityByDepartureId.set(
      departure.id,
      buildAvailability(
        departure.id,
        departure.totalSeats,
        departure.seatsConfirmed,
        seatsOnHoldByDepartureId.get(departure.id) ?? 0,
      ),
    );
  }

  return availabilityByDepartureId;
}

// Availability for a single departure. Returns null when the departure
// does not exist, so the caller can tell "no such departure" apart from
// "sold out".
export async function getDepartureAvailability(
  departureId: string,
): Promise<DepartureAvailability | null> {
  const availabilityByDepartureId = await getAvailabilityForDepartures([
    departureId,
  ]);
  return availabilityByDepartureId.get(departureId) ?? null;
}

// The version to use inside a transaction, before taking money or
// confirming a booking.
//
// It locks the departure row first. Two requests for the last seat both
// read "1 available" if they run at the same time, and both succeed, and
// the trip is oversold. The lock makes the second request wait until the
// first has finished and committed, so it sees the real number.
//
// Must be called inside prisma.$transaction, and the caller must pass
// the transaction client, not the global prisma. Locks are released when
// the transaction ends, so all the work that depends on this number has
// to happen inside the same transaction.
// `excludeBookingId` leaves one booking's own hold out of the count.
// The webhook needs this when confirming: that booking is already
// holding its seats, so counting them again would make a trip look full
// against itself and trigger a refund for a booking that was fine.
//
// With it excluded, the question becomes the simple one: once this
// booking's seats are confirmed, do confirmed seats plus everybody
// else's holds still fit inside the coach?
export async function getDepartureAvailabilityForUpdate(
  tx: Prisma.TransactionClient,
  departureId: string,
  excludeBookingId?: string,
): Promise<DepartureAvailability | null> {
  // SELECT ... FOR UPDATE has no Prisma Client equivalent, so this one
  // query is raw. It blocks rather than failing, which is why there is
  // no retry loop anywhere in the booking flow.
  const lockedRows = await tx.$queryRaw<
    { id: string; totalSeats: number; seatsConfirmed: number }[]
  >`
    SELECT "id", "totalSeats", "seatsConfirmed"
    FROM "Departure"
    WHERE "id" = ${departureId}
    FOR UPDATE
  `;

  const departure = lockedRows[0];
  if (!departure) {
    return null;
  }

  const now = new Date();

  const holds = await tx.booking.aggregate({
    where: {
      departureId,
      status: "pending",
      expiresAt: { gt: now },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    _sum: { travellerCount: true },
  });

  return buildAvailability(
    departure.id,
    departure.totalSeats,
    departure.seatsConfirmed,
    holds._sum.travellerCount ?? 0,
  );
}
