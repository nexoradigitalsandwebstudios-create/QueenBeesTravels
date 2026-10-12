import Link from "next/link";

import { PRICE_BANDS, TRIP_TYPE_LABELS } from "@/lib/constants";
import {
  countActiveFilters,
  getUpcomingMonthOptions,
  type TripFilters,
} from "@/lib/trip-filters";

type CategoryOption = { slug: string; name: string };

// A plain GET form, not a client component.
//
// Submitting puts the choices in the query string, which is what makes a
// filtered listing shareable on WhatsApp, bookmarkable and reachable by
// the back button. It also works with JavaScript still loading, which on
// a phone on mobile data is a real moment rather than a hypothetical.
//
// The cost is that changing a dropdown does not filter until you press
// the button. That is the honest trade for not shipping a client
// component, and the button says what it does.
function FilterSelect({
  name,
  label,
  value,
  options,
  anyLabel,
}: {
  name: string;
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  anyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`filter-${name}`}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted"
      >
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value ?? ""}
        className="min-h-12 rounded-full border border-ink-300 bg-surface px-4 text-sm font-medium text-text-strong"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TripFilterBar({
  filters,
  categories,
  resultCount,
}: {
  filters: TripFilters;
  categories: CategoryOption[];
  resultCount: number;
}) {
  const activeCount = countActiveFilters(filters);

  const tripTypeOptions = Object.entries(TRIP_TYPE_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  const priceOptions = PRICE_BANDS.map((band) => ({
    value: band.id,
    label: band.label,
  }));

  const categoryOptions = categories.map((category) => ({
    value: category.slug,
    label: category.name,
  }));

  return (
    <section
      aria-label="Filter trips"
      className="rounded-2xl border border-border bg-ink-50 p-5 sm:p-6"
    >
      <form method="get" action="/trips">
        {/* Closed on a phone, forced open on a desktop by the
            .filters-disclosure rules in globals.css. */}
        <details className="filters-disclosure">
          {/* The layout sits on the span, NOT on the summary, and that
              is deliberate. globals.css hides this summary on a desktop
              from the components layer, and a Tailwind `flex` here would
              silently beat it: the utilities layer outranks components
              whatever the specificity. A summary carrying no display
              utility is one the stylesheet can still hide. */}
          <summary className="text-sm font-semibold text-text-strong">
            <span className="flex min-h-12 items-center justify-between gap-3">
              <span>Filters</span>
              <span className="font-normal text-text-muted">
                {activeCount === 0 ? "Any trip" : `${activeCount} applied`}
              </span>
            </span>
          </summary>

          <div className="grid gap-4 pt-4 sm:grid-cols-2 sm:pt-0 lg:grid-cols-4">
            <FilterSelect
              name="category"
              label="Kind of trip"
              value={filters.categorySlug}
              options={categoryOptions}
              anyLabel="Any kind"
            />
            <FilterSelect
              name="month"
              label="Month"
              value={filters.month}
              options={getUpcomingMonthOptions()}
              anyLabel="Any month"
            />
            <FilterSelect
              name="price"
              label="Price per person"
              value={filters.priceBandId}
              options={priceOptions}
              anyLabel="Any price"
            />
            <FilterSelect
              name="type"
              label="Who it is for"
              value={filters.tripType}
              options={tripTypeOptions}
              anyLabel="Anyone"
            />
          </div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center rounded-full bg-magenta-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-magenta-700"
          >
            Show trips
          </button>

          {activeCount > 0 ? (
            <Link
              href="/trips"
              className="inline-flex min-h-12 items-center text-sm font-semibold text-text-muted no-underline hover:text-magenta-600"
            >
              Clear {activeCount === 1 ? "filter" : `all ${activeCount} filters`}
            </Link>
          ) : null}

          {/* Announced politely so a screen reader hears the new count
              after the page reloads, without interrupting anything. */}
          <p
            aria-live="polite"
            className="ml-auto text-sm text-text-muted"
          >
            {resultCount === 1 ? "1 trip" : `${resultCount} trips`}
          </p>
        </div>
      </form>
    </section>
  );
}
