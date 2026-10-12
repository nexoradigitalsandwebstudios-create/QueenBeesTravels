import {
  BUSINESS_CITY,
  BUSINESS_FOUNDED_YEAR,
  BUSINESS_INSTAGRAM_URL,
} from "@/lib/constants";
import type { SiteSettings } from "@/lib/site-content";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 text-gold-400">
      <path
        fill="currentColor"
        d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 7.5l5.4-.8z"
      />
    </svg>
  );
}

// The numbers a woman weighs before trusting strangers with a weekend.
// Rating, review count and follower count come from the database and are
// simply left out when the client has not filled them in, because a
// rating nobody has verified is worse than no rating.
export function TrustBar({ settings }: { settings: SiteSettings }) {
  const items: { value: React.ReactNode; label: string; href?: string }[] = [
    { value: `Since ${BUSINESS_FOUNDED_YEAR}`, label: "Travelling together" },
  ];

  if (settings.googleRating) {
    items.push({
      value: (
        <span className="flex items-center justify-center gap-1.5">
          {settings.googleRating}
          <StarIcon />
        </span>
      ),
      label: settings.googleReviewCount
        ? `${settings.googleReviewCount} Google reviews`
        : "Google rating",
    });
  }

  if (settings.instagramFollowers) {
    items.push({
      value: settings.instagramFollowers,
      label: "On Instagram",
      href: BUSINESS_INSTAGRAM_URL,
    });
  }

  items.push({ value: BUSINESS_CITY, label: "Pickup and drop" });
  items.push({ value: "Ladies only", label: "Every single trip" });

  return (
    <section
      aria-label="Why women travel with us"
      className="border-b border-border bg-surface"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-5 md:py-12 lg:px-8">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={
              index === 0
                ? "text-center"
                : "text-center md:border-l md:border-border"
            }
          >
            <p className="font-display text-2xl text-ink-900 sm:text-[1.7rem]">
              {item.value}
            </p>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.18em] text-text-muted no-underline hover:text-magenta-600"
              >
                {item.label}
              </a>
            ) : (
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                {item.label}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
