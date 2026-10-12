import Image from "next/image";

import { BUSINESS_INSTAGRAM_URL } from "@/lib/constants";
import type { SiteSettings } from "@/lib/site-content";

// Instagram is where this business actually lives between trips, so the
// page ends by handing visitors over to it. The photographs come from
// the database, so the client swaps them without a deploy.
export function InstagramStrip({ settings }: { settings: SiteSettings }) {
  if (settings.instagramImages.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
              @queenbees_tvm
            </p>
            <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
              {settings.instagramFollowers
                ? `Join ${settings.instagramFollowers} following the journey`
                : "Follow the journey"}
            </h2>
            <p className="mt-5 text-lg text-text-muted">
              Trip announcements, new dates and moments from the road.
            </p>
          </div>

          <a
            href={BUSINESS_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-full border border-ink-300 px-6 font-semibold text-text-strong no-underline transition-colors hover:border-magenta-300 hover:text-magenta-700"
          >
            Follow on Instagram
          </a>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {settings.instagramImages.map((src) => (
            <li key={src}>
              {/* Decorative: the heading already says what these are, and
                  naming each one "a photo from a trip" six times is
                  noise in a screen reader. */}
              <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-100">
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-soft hover:scale-105"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
