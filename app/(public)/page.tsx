import Link from "next/link";

import { FaqSection } from "@/components/faq-section";
import { HomeHero } from "@/components/home-hero";
import { HowItWorks } from "@/components/how-it-works";
import { InstagramStrip } from "@/components/instagram-strip";
import { ReviewsSection } from "@/components/reviews-section";
import { TripCard } from "@/components/trip-card";
import { TrustBar } from "@/components/trust-bar";
import { getTripsForListing } from "@/lib/trips";
import {
  getPublishedFaqs,
  getPublishedReviews,
  getSiteSettings,
} from "@/lib/site-content";
import { BUSINESS_WHATSAPP_URL } from "@/lib/constants";

// Rendered fresh on every request, never prerendered at build time.
// This page shows seats remaining, which changes the moment somebody
// books. A statically built copy would tell a visitor three seats are
// left when the trip is already full, and on a booking site that is not
// a stale-cache annoyance, it is a refund and an apology.
//
// It also means a production build never touches the database.
export const dynamic = "force-dynamic";

// Six fills two rows on a desktop and still scrolls quickly on a phone.
const FEATURED_TRIP_COUNT = 6;

const WHAT_ITS_LIKE = [
  {
    title: "Come on your own, travel with a group",
    body: "Most women join without knowing anyone. By the second morning that stops being a thing anyone notices.",
  },
  {
    title: "Someone is always with you",
    body: "A trip captain travels with every group, from the pickup point to the drop back home.",
  },
  {
    title: "The planning is already done",
    body: "Stays, travel, entries and timings are arranged before you board. You bring a bag.",
  },
  {
    title: "Bring your daughter, bring a friend",
    body: "Some trips are for mothers and children, and friends are welcome to join together on the rest.",
  },
];

export default async function HomePage() {
  // Everything on this page comes from the database: trips, photographs,
  // prices, reviews, questions and the numbers in the trust bar. None of
  // it is written into a component.
  //
  // Four independent queries, so they run together rather than in a
  // waterfall.
  const [trips, reviews, faqs, settings] = await Promise.all([
    getTripsForListing(),
    getPublishedReviews(),
    getPublishedFaqs(),
    getSiteSettings(),
  ]);

  const featuredTrips = trips.slice(0, FEATURED_TRIP_COUNT);

  return (
    <>
      <HomeHero />
      <TrustBar settings={settings} />

      <section className="bg-ink-100 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
                Our trips
              </p>
              <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
                Places we have explored, together
              </h2>
              <p className="mt-5 text-lg text-text-muted">
                Every trip starts and ends in Trivandrum. Seats shown are the
                seats actually left, updated as people book.
              </p>
            </div>

            {trips.length > FEATURED_TRIP_COUNT ? (
              <Link
                href="/trips"
                className="inline-flex min-h-12 items-center rounded-full border border-ink-300 px-6 font-semibold text-text-strong no-underline transition-colors hover:border-magenta-300 hover:text-magenta-700"
              >
                See all {trips.length} trips
              </Link>
            ) : null}
          </div>

          {featuredTrips.length === 0 ? (
            <p className="mt-12 rounded-xl border border-border bg-surface px-5 py-10 text-center text-text-muted">
              No trips are listed yet. They appear here as soon as they are
              added in the admin dashboard.
            </p>
          ) : (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTrips.map((trip) => (
                <li key={trip.id} className="flex">
                  <TripCard trip={trip} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
              Travel solo, never alone
            </p>
            <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
              You do not need to find a travel partner first.
            </h2>
            <p className="mt-5 text-lg text-text-muted">
              Maybe your friends can never get the same days off. Maybe there is
              a place you have wanted to see for years, and you are still
              waiting for someone to say yes. You do not have to keep waiting.
            </p>
          </div>

          <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {WHAT_ITS_LIKE.map((point, index) => (
              <li key={point.title} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-300 font-display text-base font-semibold text-ink-900"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-display text-xl font-semibold text-ink-900">
                    {point.title}
                  </span>
                  <span className="mt-2 block text-text-muted">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks />

      <ReviewsSection reviews={reviews} settings={settings} />
      <FaqSection faqs={faqs} />
      <InstagramStrip settings={settings} />

      <section className="bg-ink-100 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-magenta-600 px-6 py-14 text-center shadow-brand sm:px-12 sm:py-20">
            <h2 className="text-4xl text-white sm:text-5xl">
              Tell us where you have been wanting to go.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-magenta-100">
              Send a message and we will share the dates, the plan and the
              pricing for the trip you have in mind.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={BUSINESS_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-13 items-center justify-center rounded-full bg-white px-7 font-semibold text-magenta-700 no-underline transition-colors hover:bg-magenta-50"
              >
                Message us on WhatsApp
              </a>
              <Link
                href="/trips"
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/40 px-7 font-semibold text-white no-underline transition-colors hover:bg-magenta-700"
              >
                See all trips
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
