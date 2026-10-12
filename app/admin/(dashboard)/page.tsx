import Link from "next/link";

import { AdminBookingRow } from "@/components/admin-booking-row";
import { requireAdmin } from "@/lib/admin-auth";
import {
  BOOKING_STATUS_FILTERS,
  getAdminBookings,
  getBookingStatusCounts,
  getTripsWithBookings,
} from "@/lib/admin-bookings";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookings" };

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

export default async function AdminBookingsPage(
  props: PageProps<"/admin">,
) {
  await requireAdmin();

  const raw = await props.searchParams;
  const requestedStatus = readParam(raw.status);

  const filters = {
    search: readParam(raw.search),
    // Checked against the known list so a hand-edited url cannot reach
    // a query with an arbitrary value.
    status: BOOKING_STATUS_FILTERS.includes(
      requestedStatus as (typeof BOOKING_STATUS_FILTERS)[number],
    )
      ? requestedStatus
      : null,
    tripSlug: readParam(raw.trip),
  };

  const [bookings, counts, trips] = await Promise.all([
    getAdminBookings(filters),
    getBookingStatusCounts(),
    getTripsWithBookings(),
  ]);

  // The export keeps whatever filters are on screen, so what downloads
  // is what she is looking at.
  const exportParams = new URLSearchParams();
  if (filters.search) exportParams.set("search", filters.search);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.tripSlug) exportParams.set("trip", filters.tripSlug);
  const exportHref = `/api/admin/bookings/export?${exportParams.toString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Bookings</h1>
          <p className="mt-1 text-sm text-text-muted">
            {bookings.length} shown
            {filters.search || filters.status || filters.tripSlug
              ? " with filters applied"
              : ""}
          </p>
        </div>

        <a
          href={exportHref}
          className="inline-flex min-h-11 items-center rounded-full border border-ink-300 bg-surface px-5 text-sm font-semibold text-text-strong no-underline transition-colors hover:border-magenta-300"
        >
          Download CSV
        </a>
      </div>

      {/* Status chips double as a summary and a filter. */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/admin"
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold no-underline ${
            filters.status === null
              ? "bg-ink-900 text-white"
              : "border border-ink-300 bg-surface text-text-strong"
          }`}
        >
          All
        </Link>
        {BOOKING_STATUS_FILTERS.map((status) => (
          <Link
            key={status}
            href={`/admin?status=${status}`}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold no-underline ${
              filters.status === status
                ? "bg-ink-900 text-white"
                : "border border-ink-300 bg-surface text-text-strong"
            }`}
          >
            {BOOKING_STATUS_LABELS[status] ?? status}
            <span className="ml-2 text-xs opacity-70">
              {counts[status] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <form
        method="get"
        action="/admin"
        className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        {/* Keeps the chosen status when searching. */}
        {filters.status ? (
          <input type="hidden" name="status" value={filters.status} />
        ) : null}

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Search
          </span>
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Reference, name or phone"
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Trip
          </span>
          <select
            name="trip"
            defaultValue={filters.tripSlug ?? ""}
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          >
            <option value="">Any trip</option>
            {trips.map((trip) => (
              <option key={trip.slug} value={trip.slug}>
                {trip.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 items-center rounded-full bg-magenta-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-magenta-700"
        >
          Apply
        </button>

        <Link
          href="/admin"
          className="inline-flex min-h-12 items-center text-sm font-semibold text-text-muted no-underline hover:text-magenta-600"
        >
          Clear
        </Link>
      </form>

      {bookings.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface px-5 py-12 text-center text-text-muted">
          No bookings match. Try clearing the filters.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          {bookings.map((booking) => (
            <AdminBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
