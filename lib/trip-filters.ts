// Reading and validating the trip listing filters from the URL.
//
// Filters live in the query string rather than in component state, so a
// filtered listing can be bookmarked, shared on WhatsApp and reached by
// the back button. That also means the values arrive from outside and
// cannot be trusted: everything here is checked against a known list and
// anything unrecognised becomes null rather than reaching a query.

import { MONTH_NAMES, PRICE_BANDS, TRIP_TYPE_LABELS } from "@/lib/constants";

export type TripFilters = {
  categorySlug: string | null;
  tripType: string | null;
  // "YYYY-MM". The year is included on purpose: "December" alone is
  // ambiguous once the listing spans a year boundary, which it does
  // every autumn.
  month: string | null;
  priceBandId: string | null;
};

export const EMPTY_FILTERS: TripFilters = {
  categorySlug: null,
  tripType: null,
  month: null,
  priceBandId: null,
};

// How far ahead the month dropdown goes. Beyond a year the client is
// not publishing dates anyway.
const MONTHS_AHEAD = 12;

export type MonthOption = { value: string; label: string };

export function getUpcomingMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const today = new Date();

  for (let offset = 0; offset < MONTHS_AHEAD; offset += 1) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1),
    );
    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth();
    const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    options.push({ value, label: `${MONTH_NAMES[monthIndex]} ${year}` });
  }

  return options;
}

// The first instant of the month and the first instant of the next one.
// Returns null for anything that is not a real YYYY-MM, so a hand-edited
// url cannot produce an Invalid Date and an empty listing nobody can
// explain.
export function getMonthRange(
  month: string,
): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function findPriceBand(bandId: string) {
  return PRICE_BANDS.find((band) => band.id === bandId) ?? null;
}

function readOne(
  value: string | string[] | undefined,
): string | null {
  // A repeated query parameter arrives as an array. Take the first
  // rather than throwing, because that is what a visitor who pasted a
  // mangled link expects to happen.
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

export function parseTripFilters(
  rawParams: Record<string, string | string[] | undefined>,
  knownCategorySlugs: string[],
): TripFilters {
  const category = readOne(rawParams.category);
  const type = readOne(rawParams.type);
  const month = readOne(rawParams.month);
  const price = readOne(rawParams.price);

  const validTripTypes = Object.keys(TRIP_TYPE_LABELS);
  // Checked against the months actually on offer, not merely against the
  // YYYY-MM shape. A hand-edited link asking for January 2020 is well
  // formed but unselectable, and honouring it would show an empty page
  // while every dropdown read "Any month". Ignoring it instead keeps the
  // url and the controls telling the same story.
  const offeredMonths = getUpcomingMonthOptions().map((option) => option.value);

  return {
    categorySlug:
      category && knownCategorySlugs.includes(category) ? category : null,
    tripType: type && validTripTypes.includes(type) ? type : null,
    month: month && offeredMonths.includes(month) ? month : null,
    priceBandId: price && findPriceBand(price) ? price : null,
  };
}

export function countActiveFilters(filters: TripFilters): number {
  return Object.values(filters).filter((value) => value !== null).length;
}

// True when a filter narrows which DEPARTURES match, as opposed to which
// trips. A trip with no matching departure should disappear from the
// listing, but a trip with no dates at all still belongs there when only
// category or type is set.
export function hasDepartureFilter(filters: TripFilters): boolean {
  return filters.month !== null || filters.priceBandId !== null;
}
