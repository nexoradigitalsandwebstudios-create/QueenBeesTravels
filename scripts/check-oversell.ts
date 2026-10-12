import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  getDepartureAvailability,
  getDepartureAvailabilityForUpdate,
  seatHoldExpiresAt,
} from "../lib/availability";

// Two people try to book the last seats at the same moment.
//
// The departure has 3 seats left and each attempt wants 2. Exactly one
// of them must succeed. The run is done twice: once using the locking
// read, once using the plain read, to show the lock is what makes the
// difference rather than the test being too gentle.

const SEATS_WANTED = 2;

async function resetBookings() {
  await prisma.booking.deleteMany({
    where: { bookingRef: { startsWith: "RACE-" } },
  });
}

async function attemptWithLock(departureId: string, label: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const availability = await getDepartureAvailabilityForUpdate(tx, departureId);
      if (!availability) throw new Error(`Departure not found: ${departureId}`);

      if (availability.availableSeats < SEATS_WANTED) {
        return `${label}: refused, only ${availability.availableSeats} seat(s) left`;
      }

      // Stand-in for the work the real booking route does between
      // reading availability and writing the booking.
      await new Promise((resolve) => setTimeout(resolve, 150));

      await tx.booking.create({
        data: {
          bookingRef: `RACE-${label}`,
          departureId,
          customerName: `Racer ${label}`,
          phone: `90000000${label}`,
          travellerCount: SEATS_WANTED,
          travellerNames: ["One", "Two"],
          totalAmount: 17000,
          status: "pending",
          expiresAt: seatHoldExpiresAt(),
        },
      });
      return `${label}: booked ${SEATS_WANTED} seat(s)`;
    });
  } catch (error) {
    return `${label}: error ${error instanceof Error ? error.message.split("\n")[0] : error}`;
  }
}

async function attemptWithoutLock(departureId: string, label: string) {
  try {
    // Deliberately the unsafe version: reads availability outside any
    // lock, exactly the bug the locking helper exists to prevent.
    const availability = await getDepartureAvailability(departureId);
    if (!availability) throw new Error(`Departure not found: ${departureId}`);

    if (availability.availableSeats < SEATS_WANTED) {
      return `${label}: refused, only ${availability.availableSeats} seat(s) left`;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    await prisma.booking.create({
      data: {
        bookingRef: `RACE-${label}`,
        departureId,
        customerName: `Racer ${label}`,
        phone: `90000000${label}`,
        travellerCount: SEATS_WANTED,
        travellerNames: ["One", "Two"],
        totalAmount: 17000,
        status: "pending",
        expiresAt: seatHoldExpiresAt(),
      },
    });
    return `${label}: booked ${SEATS_WANTED} seat(s)`;
  } catch (error) {
    return `${label}: error ${error instanceof Error ? error.message.split("\n")[0] : error}`;
  }
}

async function runScenario(
  name: string,
  departureId: string,
  attempt: (departureId: string, label: string) => Promise<string>,
) {
  await resetBookings();

  const before = await getDepartureAvailability(departureId);
  const results = await Promise.all([
    attempt(departureId, "A"),
    attempt(departureId, "B"),
  ]);
  const after = await getDepartureAvailability(departureId);

  // availableSeats is clamped at zero, so it cannot show an oversell.
  // Compare claimed seats against real capacity instead.
  const seatsClaimed = (after?.seatsConfirmed ?? 0) + (after?.seatsOnHold ?? 0);
  const capacity = after?.totalSeats ?? 0;
  const oversold = seatsClaimed > capacity;

  console.log(`\n--- ${name} ---`);
  console.log(`seats available before: ${before?.availableSeats}`);
  for (const result of results) console.log(`  ${result}`);
  console.log(`seats claimed after: ${seatsClaimed} against capacity ${capacity}`);
  console.log(
    oversold
      ? `RESULT: OVERSOLD by ${seatsClaimed - capacity} seat(s)`
      : "RESULT: not oversold",
  );

  return oversold;
}

async function main() {
  await resetBookings();

  // Chosen by shape rather than by a hardcoded slug, so renaming a
  // seeded trip does not break this. The race needs a departure with
  // exactly enough room for one of the two attempts and not both.
  const openDepartures = await prisma.departure.findMany({
    where: { status: "open" },
    orderBy: { startDate: "asc" },
  });

  const departure = openDepartures.find((candidate) => {
    const free = candidate.totalSeats - candidate.seatsConfirmed;
    return free >= SEATS_WANTED && free < SEATS_WANTED * 2;
  });

  if (!departure) {
    console.log(
      `FAIL  the seed needs a departure with between ${SEATS_WANTED} and ${SEATS_WANTED * 2 - 1} seats free, so that two simultaneous attempts cannot both legitimately succeed. Run: npx prisma@7 db seed`,
    );
    process.exit(1);
  }

  const departureId = departure.id;

  const unsafeOversold = await runScenario(
    "WITHOUT the row lock (the bug)",
    departureId,
    attemptWithoutLock,
  );
  const safeOversold = await runScenario(
    "WITH the row lock (lib/availability.ts)",
    departureId,
    attemptWithLock,
  );

  await resetBookings();
  await prisma.$disconnect();

  console.log("\n==================================================");
  console.log(`unlocked version oversold: ${unsafeOversold}`);
  console.log(`locked version oversold:   ${safeOversold}`);

  // The test is only meaningful if the unlocked version actually fails
  // and the locked one actually holds.
  const proved = unsafeOversold === true && safeOversold === false;
  console.log(
    proved
      ? "PROVED: the lock is what prevents the oversell"
      : "INCONCLUSIVE: rerun, the race did not reproduce",
  );
  process.exit(proved ? 0 : 1);
}

main();
