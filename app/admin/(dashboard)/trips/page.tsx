import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatRupees } from "@/lib/money";
import { TRIP_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Trips" };

export default async function AdminTripsPage() {
  await requireAdmin();

  const trips = await prisma.trip.findMany({
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      destination: true,
      tripType: true,
      isActive: true,
      images: true,
      categories: { select: { name: true } },
      departures: {
        where: { startDate: { gte: new Date() }, status: "open" },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, pricePerPerson: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Trips</h1>
          <p className="mt-1 text-sm text-text-muted">
            {trips.length} trip{trips.length === 1 ? "" : "s"}. Hidden trips
            do not appear anywhere on the public site.
          </p>
        </div>

        <Link
          href="/admin/trips/new"
          className="inline-flex min-h-11 items-center rounded-full bg-magenta-600 px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-magenta-700"
        >
          Add a trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface px-5 py-12 text-center text-text-muted">
          No trips yet. Add the first one.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-display text-lg font-semibold text-ink-900">
                    {trip.title}
                  </span>
                  <span className="block text-sm text-text-muted">
                    {trip.destination}
                  </span>
                </span>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    trip.isActive
                      ? "bg-leaf-100 text-leaf-700"
                      : "bg-ink-200 text-ink-700"
                  }`}
                >
                  {trip.isActive ? "Live" : "Hidden"}
                </span>
              </div>

              <p className="mt-3 text-sm text-text-muted">
                {TRIP_TYPE_LABELS[trip.tripType] ?? trip.tripType}
                {trip.categories.length > 0
                  ? ` · ${trip.categories.map((c) => c.name).join(", ")}`
                  : ""}
              </p>

              <p className="mt-2 text-sm">
                {trip.departures.length === 0 ? (
                  <span className="font-semibold text-clay-600">
                    No upcoming dates
                  </span>
                ) : (
                  <span className="text-text-muted">
                    {trip.departures.length} upcoming date
                    {trip.departures.length === 1 ? "" : "s"}, from{" "}
                    {formatRupees(
                      Math.min(
                        ...trip.departures.map((d) => d.pricePerPerson),
                      ),
                    )}
                  </span>
                )}
              </p>

              {trip.images.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-clay-600">
                  No photo yet
                </p>
              ) : null}

              <div className="mt-auto flex gap-3 pt-4">
                <Link
                  href={`/admin/trips/${trip.id}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-ink-300 px-4 text-sm font-semibold text-text-strong no-underline hover:border-magenta-300"
                >
                  Edit
                </Link>
                <Link
                  href={`/trips/${trip.slug}`}
                  target="_blank"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted no-underline hover:text-magenta-600"
                >
                  View on site
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
