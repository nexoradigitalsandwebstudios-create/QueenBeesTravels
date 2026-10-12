import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  getAvailabilityForDepartures,
  getDepartureAvailability,
  getDepartureAvailabilityForUpdate,
  seatHoldExpiresAt,
} from "../lib/availability";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

async function main() {
  // Clean slate first, so leftovers from an interrupted run do not make
  // a sold-out departure look bookable while we are picking one.
  await prisma.booking.deleteMany({
    where: { bookingRef: { startsWith: "CHECK-" } },
  });

  // Departures are chosen by their shape, not by a hardcoded slug. The
  // seed content changes, and a check that breaks every time someone
  // renames a trip is a check people start ignoring.
  const openDepartures = await prisma.departure.findMany({
    where: { status: "open" },
    orderBy: { startDate: "asc" },
  });

  const bookable = openDepartures.find(
    (departure) => departure.totalSeats - departure.seatsConfirmed >= 3,
  );
  const soldOut = openDepartures.find(
    (departure) => departure.totalSeats - departure.seatsConfirmed === 0,
  );

  if (!bookable || !soldOut) {
    console.log(
      "FAIL  the seed needs one departure with at least 3 seats free and one with none. Run: npx prisma@7 db seed",
    );
    process.exit(1);
  }

  const freeSeats = bookable.totalSeats - bookable.seatsConfirmed;

  // --- 1. Seeded state, no bookings at all -------------------------
  const seeded = await getDepartureAvailability(bookable.id);
  check(
    `bookable: ${bookable.totalSeats} total - ${bookable.seatsConfirmed} confirmed`,
    seeded?.availableSeats,
    freeSeats,
  );
  check("bookable: not sold out", seeded?.isSoldOut, false);

  const seededFull = await getDepartureAvailability(soldOut.id);
  check("sold out: 0 available", seededFull?.availableSeats, 0);
  check("sold out: isSoldOut true", seededFull?.isSoldOut, true);

  // --- 2. An unexpired pending booking holds its seats -------------
  await prisma.booking.create({
    data: {
      bookingRef: "CHECK-HOLD",
      departureId: bookable.id,
      customerName: "Hold Test",
      phone: "9000000001",
      travellerCount: 2,
      travellerNames: ["Hold Test", "Companion"],
      totalAmount: 17000,
      status: "pending",
      expiresAt: seatHoldExpiresAt(),
    },
  });

  const withHold = await getDepartureAvailability(bookable.id);
  check(`pending hold of 2 reduces ${freeSeats} to ${freeSeats - 2}`, withHold?.availableSeats, freeSeats - 2);
  check("pending hold is reported as seatsOnHold", withHold?.seatsOnHold, 2);

  // --- 3. An expired pending booking holds nothing -----------------
  await prisma.booking.create({
    data: {
      bookingRef: "CHECK-EXPIRED",
      departureId: bookable.id,
      customerName: "Expired Test",
      phone: "9000000002",
      travellerCount: 1,
      travellerNames: ["Expired Test"],
      totalAmount: 8500,
      status: "pending",
      // One minute in the past.
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });

  const withExpired = await getDepartureAvailability(bookable.id);
  check("expired hold does not reduce availability", withExpired?.availableSeats, freeSeats - 2);
  check("expired hold not counted in seatsOnHold", withExpired?.seatsOnHold, 2);

  // --- 4. A cancelled booking holds nothing ------------------------
  await prisma.booking.create({
    data: {
      bookingRef: "CHECK-CANCELLED",
      departureId: bookable.id,
      customerName: "Cancelled Test",
      phone: "9000000003",
      travellerCount: 3,
      travellerNames: ["A", "B", "C"],
      totalAmount: 25500,
      status: "cancelled",
      expiresAt: seatHoldExpiresAt(),
      cancelledAt: new Date(),
    },
  });

  const withCancelled = await getDepartureAvailability(bookable.id);
  check("cancelled booking does not hold seats", withCancelled?.availableSeats, freeSeats - 2);

  // --- 5. Batch version agrees with the single version -------------
  const batch = await getAvailabilityForDepartures([bookable.id, soldOut.id]);
  check("batch returns both departures", batch.size, 2);
  check("batch bookable matches", batch.get(bookable.id)?.availableSeats, freeSeats - 2);
  check("batch sold out matches", batch.get(soldOut.id)?.availableSeats, 0);

  // --- 6. Locking version agrees, inside a transaction -------------
  const locked = await prisma.$transaction(async (tx) => {
    return getDepartureAvailabilityForUpdate(tx, bookable.id);
  });
  check("FOR UPDATE version matches plain read", locked?.availableSeats, freeSeats - 2);
  check("FOR UPDATE version reports holds", locked?.seatsOnHold, 2);

  // --- 7. Missing departure is null, not zero ----------------------
  const missing = await getDepartureAvailability("does-not-exist");
  check("unknown departure returns null", missing, null);

  const missingLocked = await prisma.$transaction(async (tx) => {
    return getDepartureAvailabilityForUpdate(tx, "does-not-exist");
  });
  check("unknown departure returns null under lock", missingLocked, null);

  // --- 8. Empty input does not query at all ------------------------
  const empty = await getAvailabilityForDepartures([]);
  check("empty id list returns empty map", empty.size, 0);

  await prisma.booking.deleteMany({
    where: { bookingRef: { startsWith: "CHECK-" } },
  });

  const afterCleanup = await getDepartureAvailability(bookable.id);
  check(`back to ${freeSeats} available after cleanup`, afterCleanup?.availableSeats, freeSeats);

  await prisma.$disconnect();
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
