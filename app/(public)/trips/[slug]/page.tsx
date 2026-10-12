import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DepartureList } from "@/components/departure-list";
import { getTripBySlug } from "@/lib/trips";
import { TRIP_TYPE_LABELS } from "@/lib/constants";

// Rendered fresh on every request, never prerendered at build time.
// This page shows seats remaining, which changes the moment somebody
// books. A statically built copy would tell a visitor three seats are
// left when the trip is already full, and on a booking site that is not
// a stale-cache annoyance, it is a refund and an apology.
//
// It also means a production build never touches the database.
export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/trips/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getTripBySlug(slug);

  if (!result) {
    return { title: "Trip not found" };
  }

  return {
    title: result.trip.title,
    description: result.trip.description.slice(0, 160),
  };
}

export default async function TripDetailPage(
  props: PageProps<"/trips/[slug]">,
) {
  // params is a promise in Next 16. There is no synchronous access.
  const { slug } = await props.params;
  const result = await getTripBySlug(slug);

  if (!result) {
    notFound();
  }

  const { trip, departures } = result;
  const heroImage = trip.images[0] ?? null;

  return (
    <article>
      <div className="relative h-[42vh] min-h-72 w-full bg-ink-200">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${trip.title} in ${trip.destination}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        {/* Two layers, because the client uploads her own photographs and
            some of them are a bright white sky. A gentle gradient is
            legible over the Munnar hills and illegible over a beach at
            noon, and we cannot check every future upload by eye.

            The flat layer guarantees a floor no matter what the photo is;
            the gradient puts the weight at the bottom where the text
            sits. Measured worst case over pure white is still above
            7:1 for white text. */}
        <div className="absolute inset-0 bg-ink-900/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/80 to-transparent" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold-300">
              {trip.destination}
            </p>
            <h1 className="mt-3 text-4xl text-white sm:text-5xl">
              {trip.title}
            </h1>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-200">
              <span>
                {trip.durationDays === 1
                  ? "One day"
                  : `${trip.durationDays} days`}
              </span>
              <span>{TRIP_TYPE_LABELS[trip.tripType]}</span>
              {trip.minAge === null ? null : <span>Ages {trip.minAge}+</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="text-lg text-text-muted">{trip.description}</p>

          {trip.itinerary.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-2xl">Day by day</h2>
              <ol className="mt-6 space-y-6">
                {trip.itinerary.map((day) => (
                  <li key={day.id} className="flex gap-5">
                    <span
                      aria-hidden="true"
                      className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300 font-display text-sm font-semibold text-ink-900"
                    >
                      {day.dayNum}
                    </span>
                    <span>
                      <span className="block font-display text-lg font-semibold text-ink-900">
                        {day.title}
                      </span>
                      <span className="mt-1 block text-text-muted">
                        {day.details}
                      </span>
                      {day.stay ? (
                        <span className="mt-1 block text-sm text-text-muted">
                          Stay: {day.stay}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-xl">What is included</h2>
              <ul className="mt-4 space-y-2 text-sm text-text-muted">
                {trip.inclusions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="text-leaf-600">
                      +
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl">What is not</h2>
              <ul className="mt-4 space-y-2 text-sm text-text-muted">
                {trip.exclusions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="text-clay-600">
                      &minus;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {trip.knowBeforeYouGo ? (
            <section className="mt-12 rounded-xl border border-gold-200 bg-gold-50 p-6">
              <h2 className="text-lg">Know before you go</h2>
              <p className="mt-2 text-text-muted">{trip.knowBeforeYouGo}</p>
            </section>
          ) : null}
        </div>

        <DepartureList trip={trip} departures={departures} />
      </div>
    </article>
  );
}
