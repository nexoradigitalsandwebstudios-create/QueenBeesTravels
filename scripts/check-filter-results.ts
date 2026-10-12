import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getTripsForListing } from "../lib/trips";
import { EMPTY_FILTERS } from "../lib/trip-filters";

// Exercises the real filtered query against the seeded database, so a
// mistake in the where clause shows up here rather than as an empty
// listing nobody can explain.

let failures = 0;
function check(label: string, passed: boolean, detail: string) {
  if (!passed) failures += 1;
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}  ${detail}`);
}

async function main() {
  const all = await getTripsForListing(EMPTY_FILTERS);
  check("unfiltered returns trips", all.length > 0, `${all.length} trips`);

  // --- category ---------------------------------------------------
  const treks = await getTripsForListing({ ...EMPTY_FILTERS, categorySlug: "trek" });
  const everyTrekHasCategory = treks.every((trip) =>
    trip.categories.some((category) => category.slug === "trek"),
  );
  check("category filter narrows", treks.length < all.length, `${treks.length} of ${all.length}`);
  check("every result has that category", everyTrekHasCategory, `${treks.length} checked`);

  // --- trip type --------------------------------------------------
  const mothers = await getTripsForListing({ ...EMPTY_FILTERS, tripType: "mother_and_kids" });
  check(
    "trip type filter returns only that type",
    mothers.every((trip) => trip.tripType === "mother_and_kids"),
    `${mothers.length} trips`,
  );

  // --- price band -------------------------------------------------
  const cheap = await getTripsForListing({ ...EMPTY_FILTERS, priceBandId: "under-10k" });
  const allUnder10k = cheap.every(
    (trip) => trip.nextDeparture !== null && trip.nextDeparture.pricePerPerson <= 9999,
  );
  check("price band returns only matching departures", allUnder10k, `${cheap.length} trips`);

  const expensive = await getTripsForListing({ ...EMPTY_FILTERS, priceBandId: "above-50k" });
  check("no seeded trip is above 50k", expensive.length === 0, `${expensive.length} trips`);

  // --- month ------------------------------------------------------
  const soonest = all.find((trip) => trip.nextDeparture !== null);
  if (!soonest || !soonest.nextDeparture) {
    check("a seeded departure exists to test the month filter", false, "none found");
  } else {
    const date = soonest.nextDeparture.startDate;
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const inMonth = await getTripsForListing({ ...EMPTY_FILTERS, month: monthKey });
    const allInThatMonth = inMonth.every((trip) => {
      if (!trip.nextDeparture) return false;
      const d = trip.nextDeparture.startDate;
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` === monthKey;
    });
    check(`month ${monthKey} returns results`, inMonth.length > 0, `${inMonth.length} trips`);
    check("every result departs in that month", allInThatMonth, `${inMonth.length} checked`);
  }

  // A month far in the past must return nothing, never everything.
  const past = await getTripsForListing({ ...EMPTY_FILTERS, month: "2020-01" });
  check("a past month returns nothing", past.length === 0, `${past.length} trips`);

  // --- combined ---------------------------------------------------
  const combined = await getTripsForListing({
    ...EMPTY_FILTERS,
    categorySlug: "hill-station",
    priceBandId: "under-10k",
  });
  const combinedValid = combined.every(
    (trip) =>
      trip.categories.some((c) => c.slug === "hill-station") &&
      trip.nextDeparture !== null &&
      trip.nextDeparture.pricePerPerson <= 9999,
  );
  check("combined filters both apply", combinedValid, `${combined.length} trips`);

  // --- invalid input is ignored, not fatal ------------------------
  const nonsense = await getTripsForListing({
    ...EMPTY_FILTERS,
    month: "not-a-month",
  });
  check(
    "an invalid month is ignored rather than emptying the page",
    nonsense.length === all.length,
    `${nonsense.length} vs ${all.length}`,
  );

  await prisma.$disconnect();
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
