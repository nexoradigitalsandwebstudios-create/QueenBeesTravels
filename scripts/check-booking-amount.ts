// Rule 1 against the real running route: a client-supplied amount
// changes nothing about what gets charged.
//
// Start the dev server first, then:
//
//     npm run check:booking-amount
//
// It works with placeholder Razorpay keys. The order creation fails in
// that case, which the route handles by cancelling the booking and
// releasing the seats, and the cancelled row still proves what the
// server computed. With real test keys it also checks the full success
// response.

import "dotenv/config";
import { prisma } from "../lib/prisma";

const BASE_URL = process.env.CHECK_BASE_URL ?? "http://localhost:3000";
const TEST_NAME = "Amount Check";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  );
}

function razorpayKeysLookReal(): boolean {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return (
    id.startsWith("rzp_") &&
    !id.includes("REPLACE_ME") &&
    secret.length > 0 &&
    !secret.includes("REPLACE_ME")
  );
}

async function postBooking(body: unknown) {
  const response = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function cleanup() {
  await prisma.payment.deleteMany({
    where: { booking: { customerName: TEST_NAME } },
  });
  await prisma.booking.deleteMany({ where: { customerName: TEST_NAME } });
}

async function main() {
  await cleanup();

  const departure = await prisma.departure.findFirstOrThrow({
    where: { status: "open", startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    include: { trip: { select: { title: true } } },
  });

  const freeSeats = departure.totalSeats - departure.seatsConfirmed;
  if (freeSeats < 2) {
    console.log("FAIL  need a departure with at least 2 free seats. Reseed.");
    process.exit(1);
  }

  const travellers = 2;
  const expectedAdvance = departure.advanceAmount * travellers;
  const expectedTotal = departure.pricePerPerson * travellers;
  const keysReal = razorpayKeysLookReal();

  console.log(
    `departure ${departure.id} (${departure.trip.title}): ${departure.advanceAmount} advance, ${departure.pricePerPerson} price, per person`,
  );
  console.log(
    keysReal
      ? "Razorpay keys look real: checking the full success path too.\n"
      : "Razorpay keys are placeholders: checking what the server computed before the order call failed.\n",
  );

  const baseBody = {
    departureId: departure.id,
    customerName: TEST_NAME,
    phone: "9000000099",
    travellerCount: travellers,
    travellerNames: [TEST_NAME, "Companion"],
  };

  // --- 1. A client trying every name it might use for "price" -------
  const hostile = await postBooking({
    ...baseBody,
    amount: 1,
    amountDueRupees: 1,
    totalAmount: 1,
    advanceAmount: 1,
    pricePerPerson: 1,
    price: 1,
  });

  check(
    "a hostile body does not produce a client error",
    hostile.status === 200 || hostile.status === 502,
    true,
  );

  if (keysReal) {
    check("booking succeeded", hostile.status, 200);
    check(
      "client-supplied amount IGNORED, advance is the real one",
      hostile.json.amountDueRupees,
      expectedAdvance,
    );
    check(
      "client-supplied total IGNORED",
      hostile.json.totalAmountRupees,
      expectedTotal,
    );
  } else {
    check(
      "order creation failed and the route reported it as 502",
      hostile.status,
      502,
    );
  }

  // --- 2. What the server actually wrote to the database -------------
  const stored = await prisma.booking.findFirst({
    where: { customerName: TEST_NAME },
    orderBy: { createdAt: "desc" },
    include: { payments: true },
  });

  check(
    "a booking row was written with the REAL total, not the supplied 1",
    stored?.totalAmount,
    expectedTotal,
  );
  check("nothing was marked paid", stored?.amountPaid, 0);
  check(
    "a seat hold expiry was set",
    stored ? stored.expiresAt.getTime() > 0 : false,
    true,
  );

  if (keysReal) {
    check(
      "the payment row holds the REAL advance",
      stored?.payments[0]?.amount,
      expectedAdvance,
    );
    check("booking is pending, awaiting the webhook", stored?.status, "pending");
  } else {
    check(
      "seats were released when the order could not be created",
      stored?.status,
      "cancelled",
    );
  }

  // --- 3. Rejection paths, which never reach Razorpay ----------------
  const greedy = await postBooking({
    ...baseBody,
    phone: "9000000097",
    travellerCount: 10,
    travellerNames: ["A"],
  });
  check(
    "asking for more seats than exist is refused",
    greedy.status === 409 || greedy.status === 400,
    true,
  );

  const rubbish = await postBooking({
    departureId: departure.id,
    customerName: "",
    phone: "not a phone",
    travellerCount: 0,
    travellerNames: [],
  });
  check("invalid input is rejected", rubbish.status, 400);

  const unknown = await postBooking({
    ...baseBody,
    phone: "9000000096",
    departureId: "does-not-exist",
  });
  check("unknown departure is rejected", unknown.status, 404);

  const namesMismatch = await postBooking({
    ...baseBody,
    phone: "9000000095",
    travellerCount: 1,
    travellerNames: ["One", "Two", "Three"],
  });
  check("more names than travellers is rejected", namesMismatch.status, 400);

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
