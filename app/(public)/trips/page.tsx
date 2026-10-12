import type { Metadata } from "next";

import { TripCard } from "@/components/trip-card";
import { TripFilterBar } from "@/components/trip-filters";
import { getTripsForListing } from "@/lib/trips";
import { getFilterableCategories } from "@/lib/site-content";
import { countActiveFilters, parseTripFilters } from "@/lib/trip-filters";
import { BUSINESS_WHATSAPP_URL } from "@/lib/constants";

// Rendered fresh on every request, never prerendered at build time.
// This page shows seats remaining, which changes the moment somebody
// books. A statically built copy would tell a visitor three seats are
// left when the trip is already full, and on a booking site that is not
// a stale-cache annoyance, it is a refund and an apology.
//
// It also means a production build never touches the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All trips",
  description:
    "Every Queen Bees departure currently open for booking, with dates, pricing and seats remaining.",
};

export default async function TripsPage(props: PageProps<"/trips">) {
  // searchParams is a promise in Next 16. There is no synchronous
  // access to it.
  const rawParams = await props.searchParams;

  // Categories are loaded first because the filter parser needs the real
  // slugs to validate against. Anything unrecognised in the url is
  // discarded rather than passed to a query.
  const categories = await getFilterableCategories();
  const filters = parseTripFilters(
    rawParams,
    categories.map((category) => category.slug),
  );

  const trips = await getTripsForListing(filters);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
          Our trips
        </p>
        <h1 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
          Where we are going next
        </h1>
        <p className="mt-5 text-lg text-text-muted">
          Every trip below starts and ends in Trivandrum. Seats shown are the
          seats actually left, updated as people book.
        </p>
      </header>

      <div className="mt-10">
        <TripFilterBar
          filters={filters}
          categories={categories}
          resultCount={trips.length}
        />
      </div>

      {trips.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-ink-50 px-6 py-12 text-center">
          <p className="font-display text-2xl font-semibold text-ink-900">
            {activeFilterCount === 0
              ? "No trips are listed yet"
              : "Nothing matches those filters"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-text-muted">
            {activeFilterCount === 0
              ? "Trips appear here as soon as they are added in the admin dashboard."
              : "Try a different month or a wider price range, or ask us what else is coming up."}
          </p>
          <a
            href={BUSINESS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-magenta-600 px-6 font-semibold text-white no-underline shadow-brand transition-colors hover:bg-magenta-700"
          >
            Ask us on WhatsApp
          </a>
        </div>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <li key={trip.id} className="flex">
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-14 rounded-2xl border border-gold-200 bg-gold-50 px-6 py-8 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">
          Not seeing the place you have in mind?
        </p>
        <p className="mt-2 text-text-muted">
          Tell us where you want to go and we will see what we can put together.
        </p>
        <a
          href={BUSINESS_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-magenta-600 px-6 font-semibold text-white no-underline shadow-brand transition-colors hover:bg-magenta-700"
        >
          Message us on WhatsApp
        </a>
      </div>
    </div>
  );
}
