import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDepartureEditor } from "@/components/admin-departure-editor";
import { AdminImageUploader } from "@/components/admin-image-uploader";
import { AdminTripForm } from "@/components/admin-trip-form";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit trip" };

// A date input wants YYYY-MM-DD. The stored value is UTC midnight, so
// slicing the ISO string gives the same calendar day the admin picked.
function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function EditTripPage(
  props: PageProps<"/admin/trips/[tripId]">,
) {
  await requireAdmin();

  const { tripId } = await props.params;

  const [trip, categories] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        categories: { select: { slug: true } },
        departures: {
          orderBy: { startDate: "asc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            pricePerPerson: true,
            advanceAmount: true,
            totalSeats: true,
            seatsConfirmed: true,
            status: true,
            _count: { select: { bookings: true } },
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  if (!trip) {
    notFound();
  }

  const departureRows = trip.departures.map((departure) => ({
    id: departure.id,
    startDate: toDateInput(departure.startDate),
    endDate: toDateInput(departure.endDate),
    pricePerPerson: departure.pricePerPerson,
    advanceAmount: departure.advanceAmount,
    totalSeats: departure.totalSeats,
    seatsConfirmed: departure.seatsConfirmed,
    status: departure.status,
    bookingCount: departure._count.bookings,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/trips"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-magenta-600 no-underline hover:underline"
      >
        Back to trips
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{trip.title}</h1>
        <Link
          href={`/trips/${trip.slug}`}
          target="_blank"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted no-underline hover:text-magenta-600"
        >
          View on site
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-xl">Dates and prices</h2>
        <p className="mt-1 text-sm text-text-muted">
          Every price is in whole rupees. The advance is what a traveller pays
          to hold her seat; the rest is collected before the trip.
        </p>
        <div className="mt-4">
          <AdminDepartureEditor tripId={trip.id} departures={departureRows} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Photos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Upload a photo, then paste the path it gives you into the Photos box
          below.
        </p>
        <div className="mt-4">
          <AdminImageUploader />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Trip details</h2>
        <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
          <AdminTripForm
            categories={categories}
            trip={{
              id: trip.id,
              slug: trip.slug,
              title: trip.title,
              destination: trip.destination,
              description: trip.description,
              durationDays: trip.durationDays,
              tripType: trip.tripType,
              minAge: trip.minAge,
              departurePoint: trip.departurePoint,
              departureTime: trip.departureTime,
              returnPoint: trip.returnPoint,
              returnTime: trip.returnTime,
              knowBeforeYouGo: trip.knowBeforeYouGo,
              isActive: trip.isActive,
              inclusions: trip.inclusions,
              exclusions: trip.exclusions,
              images: trip.images,
              categorySlugs: trip.categories.map((c) => c.slug),
            }}
          />
        </div>
      </section>
    </div>
  );
}
