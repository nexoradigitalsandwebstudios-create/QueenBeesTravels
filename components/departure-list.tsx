import Link from "next/link";
import { formatRupees } from "@/lib/money";
import {
  BUSINESS_WHATSAPP_URL,
  LOW_SEAT_WARNING_THRESHOLD,
} from "@/lib/constants";
import type { TripDepartureOption } from "@/lib/trips";

function formatDateRange(startDate: Date, endDate: Date): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  const start = formatter.format(startDate);
  if (startDate.getTime() === endDate.getTime()) {
    return start;
  }
  return `${start} to ${formatter.format(endDate)}`;
}

function SeatLine({ departure }: { departure: TripDepartureOption }) {
  if (departure.isSoldOut) {
    return (
      <span className="font-semibold text-clay-600">
        Full. Ask to join the waitlist.
      </span>
    );
  }

  if (departure.availableSeats <= LOW_SEAT_WARNING_THRESHOLD) {
    return (
      <span className="font-semibold text-clay-600">
        Only {departure.availableSeats} of {departure.totalSeats} seats left
      </span>
    );
  }

  return (
    <span className="font-semibold text-leaf-700">
      {departure.availableSeats} of {departure.totalSeats} seats open
    </span>
  );
}

// An open date goes to the booking page and takes an advance. A full one
// goes to WhatsApp for the waitlist, because there is nothing to charge.
export function DepartureList({
  trip,
  departures,
}: {
  trip: { title: string; slug: string };
  departures: TripDepartureOption[];
}) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-xl">Upcoming dates</h2>

        {departures.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            No dates are open for this trip at the moment. Message us and we
            will tell you when the next one is announced.
          </p>
        ) : (
          <ul className="mt-5 space-y-5">
            {departures.map((departure) => (
              <li
                key={departure.id}
                className="border-b border-border pb-5 last:border-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg font-semibold text-ink-900">
                    {formatDateRange(departure.startDate, departure.endDate)}
                  </span>
                  <span className="font-display text-lg font-semibold text-magenta-700">
                    {formatRupees(departure.pricePerPerson)}
                  </span>
                </div>

                <p className="mt-1 text-sm">
                  <SeatLine departure={departure} />
                </p>

                <p className="mt-1 text-xs text-text-muted">
                  {formatRupees(departure.advanceAmount)} advance per person to
                  hold your seat
                </p>

                {departure.isSoldOut ? (
                  <a
                    href={`${BUSINESS_WHATSAPP_URL}?text=${encodeURIComponent(
                      `Hi, I would like to join the waitlist for ${trip.title} on ${formatDateRange(departure.startDate, departure.endDate)}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-semibold text-text-strong no-underline transition-colors hover:border-magenta-300"
                  >
                    Join the waitlist
                  </a>
                ) : (
                  <Link
                    href={`/trips/${trip.slug}/book?departure=${departure.id}`}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-magenta-600 px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-magenta-700"
                  >
                    Book this date
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
