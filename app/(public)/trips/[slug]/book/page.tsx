import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BookingForm } from "@/components/booking-form";
import { getTripBySlug } from "@/lib/trips";
import { formatRupees } from "@/lib/money";
import { BUSINESS_WHATSAPP_URL } from "@/lib/constants";

// Live seat counts, so never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book your seat",
  // This page is a step in a private transaction, not something that
  // should turn up in a search result.
  robots: { index: false, follow: false },
};

function formatDateRange(startDate: Date, endDate: Date): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
  const start = formatter.format(startDate);
  if (startDate.getTime() === endDate.getTime()) {
    return start;
  }
  return `${start} to ${formatter.format(endDate)}`;
}

export default async function BookPage(props: PageProps<"/trips/[slug]/book">) {
  const { slug } = await props.params;
  const { departure: departureId } = await props.searchParams;

  const result = await getTripBySlug(slug);
  if (!result) {
    notFound();
  }

  // The departure must belong to THIS trip. Without that check a visitor
  // could pair any trip page with any departure id and book a seat on a
  // trip at a price from somewhere else. The server still recomputes the
  // price from the departure row, so this is about showing an honest
  // page rather than about the charge.
  const departure =
    typeof departureId === "string"
      ? result.departures.find((option) => option.id === departureId)
      : undefined;

  if (!departure) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href={`/trips/${slug}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-magenta-600 no-underline hover:underline"
      >
        Back to {result.trip.title}
      </Link>

      <h1 className="mt-4 text-4xl sm:text-5xl">Hold your seat</h1>
      <p className="mt-4 text-lg text-text-muted">
        {result.trip.title}, {formatDateRange(departure.startDate, departure.endDate)}.{" "}
        {formatRupees(departure.pricePerPerson)} per person.
      </p>

      {departure.isSoldOut ? (
        <div className="mt-10 rounded-2xl border border-clay-500 bg-clay-50 p-6">
          <h2 className="text-2xl text-clay-700">This date is full</h2>
          <p className="mt-3 text-text">
            Every seat on this departure is taken. Message us and we will add
            you to the waitlist, or tell you when the next date opens.
          </p>
          <a
            href={BUSINESS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-magenta-600 px-6 font-semibold text-white no-underline transition-colors hover:bg-magenta-700"
          >
            Join the waitlist on WhatsApp
          </a>
        </div>
      ) : (
        <div className="mt-10">
          <p className="mb-6 text-sm font-semibold text-clay-600">
            {departure.availableSeats} seat
            {departure.availableSeats === 1 ? "" : "s"} left on this date
          </p>
          <BookingForm
            departureId={departure.id}
            tripTitle={result.trip.title}
            availableSeats={departure.availableSeats}
            pricePerPerson={departure.pricePerPerson}
            advancePerPerson={departure.advanceAmount}
          />
        </div>
      )}
    </div>
  );
}
