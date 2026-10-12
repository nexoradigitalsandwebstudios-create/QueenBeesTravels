// Reading trips for the public pages.
//
// Every public page gets its trips from here, so the rules about what
// counts as visible (active trip, open departure, still in the future)
// are written once. No component queries the database directly and no
// trip, image, category or price is ever hardcoded in a component.

import { prisma } from "@/lib/prisma";
import { getAvailabilityForDepartures } from "@/lib/availability";
import {
  EMPTY_FILTERS,
  findPriceBand,
  getMonthRange,
  hasDepartureFilter,
  type TripFilters,
} from "@/lib/trip-filters";
import type { Prisma } from "@/generated/prisma/client";

export type TripListItem = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  tripType: string;
  // First image, or null. Components decide what to show when there is
  // none; this layer does not invent a placeholder path.
  image: string | null;
  categories: { slug: string; name: string }[];
  // The soonest departure still open for booking, or null when a trip
  // has none scheduled.
  nextDeparture: {
    id: string;
    startDate: Date;
    pricePerPerson: number;
    availableSeats: number;
    isSoldOut: boolean;
  } | null;
  // Cheapest open departure, for the "from" price on a card.
  lowestPrice: number | null;
};

export type TripDepartureOption = {
  id: string;
  startDate: Date;
  endDate: Date;
  pricePerPerson: number;
  advanceAmount: number;
  totalSeats: number;
  availableSeats: number;
  isSoldOut: boolean;
};

// One trip and everything its page shows. Returns null when the slug
// does not exist or the trip has been deactivated, so the caller can
// render a proper 404 rather than an empty page.
export async function getTripBySlug(slug: string) {
  const trip = await prisma.trip.findFirst({
    where: { slug, isActive: true },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      },
      itinerary: { orderBy: { dayNum: "asc" } },
      departures: {
        where: { status: "open", startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!trip) {
    return null;
  }

  const availabilityByDepartureId = await getAvailabilityForDepartures(
    trip.departures.map((departure) => departure.id),
  );

  const departures: TripDepartureOption[] = trip.departures.map((departure) => {
    const availability = availabilityByDepartureId.get(departure.id);
    return {
      id: departure.id,
      startDate: departure.startDate,
      endDate: departure.endDate,
      pricePerPerson: departure.pricePerPerson,
      advanceAmount: departure.advanceAmount,
      totalSeats: departure.totalSeats,
      availableSeats: availability?.availableSeats ?? 0,
      isSoldOut: availability?.isSoldOut ?? true,
    };
  });

  return { trip, departures };
}

export async function getTripsForListing(
  filters: TripFilters = EMPTY_FILTERS,
): Promise<TripListItem[]> {
  const now = new Date();

  // A departure that has left, or that the admin has closed, is never
  // shown. The month and price filters narrow this further, so a
  // filtered card shows the departure that actually matched rather than
  // the soonest one overall.
  const departureWhere: Prisma.DepartureWhereInput = {
    status: "open",
    startDate: { gte: now },
  };

  if (filters.month) {
    const range = getMonthRange(filters.month);
    if (range) {
      departureWhere.startDate = { gte: now, lt: range.end };
      // A month that has already started should show only the days left
      // in it, not days already past.
      if (range.start > now) {
        departureWhere.startDate = { gte: range.start, lt: range.end };
      }
    }
  }

  if (filters.priceBandId) {
    const band = findPriceBand(filters.priceBandId);
    if (band) {
      departureWhere.pricePerPerson =
        band.maxRupees === null
          ? { gte: band.minRupees }
          : { gte: band.minRupees, lte: band.maxRupees };
    }
  }

  const tripWhere: Prisma.TripWhereInput = { isActive: true };
  if (filters.categorySlug) {
    tripWhere.categories = { some: { slug: filters.categorySlug } };
  }
  if (filters.tripType) {
    tripWhere.tripType = filters.tripType as Prisma.TripWhereInput["tripType"];
  }

  const trips = await prisma.trip.findMany({
    where: tripWhere,
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      },
      departures: {
        where: departureWhere,
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          pricePerPerson: true,
        },
      },
    },
  });

  // One availability query for every departure on the page rather than
  // one per card, which would be an N+1 on the busiest page on the site.
  const allDepartureIds = trips.flatMap((trip) =>
    trip.departures.map((departure) => departure.id),
  );
  const availabilityByDepartureId =
    await getAvailabilityForDepartures(allDepartureIds);

  const listItems: TripListItem[] = trips.map((trip) => {
    const soonest = trip.departures[0] ?? null;

    let nextDeparture: TripListItem["nextDeparture"] = null;
    if (soonest) {
      const availability = availabilityByDepartureId.get(soonest.id);
      nextDeparture = {
        id: soonest.id,
        startDate: soonest.startDate,
        pricePerPerson: soonest.pricePerPerson,
        availableSeats: availability?.availableSeats ?? 0,
        isSoldOut: availability?.isSoldOut ?? true,
      };
    }

    let lowestPrice: number | null = null;
    for (const departure of trip.departures) {
      if (lowestPrice === null || departure.pricePerPerson < lowestPrice) {
        lowestPrice = departure.pricePerPerson;
      }
    }

    return {
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      destination: trip.destination,
      durationDays: trip.durationDays,
      tripType: trip.tripType,
      image: trip.images[0] ?? null,
      categories: trip.categories,
      nextDeparture,
      lowestPrice,
    };
  });

  // A trip with no dates yet still belongs on an unfiltered listing,
  // shown as "Dates coming soon". But if someone asked for December or
  // for trips under ten thousand, a trip with nothing matching is not an
  // answer to that question and should disappear.
  const visibleItems = hasDepartureFilter(filters)
    ? listItems.filter((item) => item.nextDeparture !== null)
    : listItems;

  // Trips with a departure coming up first, soonest first. A trip with
  // no dates yet sits at the bottom.
  visibleItems.sort(function soonestFirst(left, right) {
    if (!left.nextDeparture && !right.nextDeparture) return 0;
    if (!left.nextDeparture) return 1;
    if (!right.nextDeparture) return -1;
    return (
      left.nextDeparture.startDate.getTime() -
      right.nextDeparture.startDate.getTime()
    );
  });

  return visibleItems;
}
