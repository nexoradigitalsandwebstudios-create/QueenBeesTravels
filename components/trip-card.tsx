import Image from "next/image";
import Link from "next/link";

import { formatRupees } from "@/lib/money";
import { LOW_SEAT_WARNING_THRESHOLD, TRIP_TYPE_LABELS } from "@/lib/constants";
import type { TripListItem } from "@/lib/trips";

function formatDepartureDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDuration(durationDays: number): string {
  if (durationDays === 1) {
    return "One day";
  }
  return `${durationDays} days`;
}

// The seat line is the whole reason to book now rather than later, so it
// gets three distinct states instead of a number nobody reads.
function SeatNotice({ trip }: { trip: TripListItem }) {
  if (!trip.nextDeparture) {
    return <span className="text-text-muted">Dates coming soon</span>;
  }

  if (trip.nextDeparture.isSoldOut) {
    return (
      <span className="font-semibold text-clay-600">
        Full, join the waitlist
      </span>
    );
  }

  if (trip.nextDeparture.availableSeats <= LOW_SEAT_WARNING_THRESHOLD) {
    return (
      <span className="font-semibold text-clay-600">
        Only {trip.nextDeparture.availableSeats} seats left
      </span>
    );
  }

  return (
    <span className="font-semibold text-leaf-700">
      {trip.nextDeparture.availableSeats} seats open
    </span>
  );
}

export function TripCard({ trip }: { trip: TripListItem }) {
  return (
    // flex-1 so the card fills its grid column. The <li> wrapping it is
    // display:flex, and without this the card is sized by its own
    // content instead, which made three cards in one row 226px, 338px
    // and 336px wide with image boxes to match.
    <article className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow duration-300 hover:shadow-lifted">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {trip.image ? (
          <Image
            src={trip.image}
            alt={`${trip.title} in ${trip.destination}`}
            fill
            // Two cards per row on a tablet, three on a desktop, one on
            // a phone. Without this the browser downloads a full width
            // image for a card a third that size.
            //
            // The first clause is a fixed 384px rather than a viewport
            // percentage because the grid stops growing at max-w-7xl.
            // Past 1280px the card stays this wide while 33vw would
            // keep climbing, so the browser would fetch a larger file
            // every time the window got wider and never use the extra.
            sizes="(min-width: 1280px) 384px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-soft group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            Photo coming soon
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-xs font-semibold text-ink-800 backdrop-blur">
          {formatDuration(trip.durationDays)}
        </span>

        {trip.tripType === "mother_and_kids" ? (
          <span className="absolute right-3 top-3 rounded-full bg-magenta-600 px-3 py-1 text-xs font-semibold text-white">
            {TRIP_TYPE_LABELS.mother_and_kids}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-magenta-600">
          {trip.destination}
        </p>

        <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">
          {/* Stretched link: the whole card is the target, which is a far
              easier thing to tap than a title on a phone. */}
          <Link href={`/trips/${trip.slug}`} className="no-underline after:absolute after:inset-0">
            {trip.title}
          </Link>
        </h3>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
          <span>
            {trip.lowestPrice === null ? (
              <span className="text-text-muted">Ask for pricing</span>
            ) : (
              <>
                <span className="text-text-muted">from </span>
                <span className="font-display text-lg font-semibold text-ink-900">
                  {formatRupees(trip.lowestPrice)}
                </span>
              </>
            )}
          </span>

          {trip.nextDeparture ? (
            <span className="text-text-muted">
              Next {formatDepartureDate(trip.nextDeparture.startDate)}
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-sm">
          <SeatNotice trip={trip} />
        </p>
      </div>
    </article>
  );
}
