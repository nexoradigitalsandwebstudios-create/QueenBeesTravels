import type { SiteSettings } from "@/lib/site-content";

type Review = {
  id: string;
  authorName: string;
  quote: string;
  rating: number;
  tripName: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <p
      className="flex gap-0.5"
      aria-label={`${rating} out of 5`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={
            star <= rating ? "h-4 w-4 text-gold-400" : "h-4 w-4 text-ink-300"
          }
        >
          <path
            fill="currentColor"
            d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 7.5l5.4-.8z"
          />
        </svg>
      ))}
    </p>
  );
}

// Real women, real names, taken from the client's Google listing. The
// section renders nothing at all when she has published none, rather
// than showing an empty shell or placeholder praise.
export function ReviewsSection({
  reviews,
  settings,
}: {
  reviews: Review[];
  settings: SiteSettings;
}) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section id="reviews" className="bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
              Reviews
            </p>
            <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
              Safe, warm and well organised
            </h2>
            <p className="mt-5 text-lg text-text-muted">
              In the words of the women who have travelled with us.
            </p>
          </div>

          {settings.googleRating ? (
            <div className="rounded-2xl border border-border bg-ink-50 px-6 py-4 text-center">
              <p className="font-display text-3xl font-semibold text-ink-900">
                {settings.googleRating}
              </p>
              <Stars rating={Math.round(Number(settings.googleRating))} />
              {settings.googleReviewCount ? (
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-text-muted">
                  {settings.googleReviewCount} Google reviews
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex">
              {/* An <article> rather than a bare <li>, because the
                  <footer> below belongs to this one review. Inside an
                  <li> a <footer> binds to the nearest sectioning
                  element, which would give this section six footers and
                  make the real page footer ambiguous. */}
              <article className="flex flex-1 flex-col rounded-2xl border border-border bg-ink-50 p-6">
                <Stars rating={review.rating} />
                <blockquote className="mt-4 flex-1 text-text">
                  {review.quote}
                </blockquote>
                <footer className="mt-5 border-t border-border pt-4">
                  <p className="font-semibold text-ink-900">
                    {review.authorName}
                  </p>
                  {review.tripName ? (
                    <p className="text-sm text-text-muted">{review.tripName}</p>
                  ) : null}
                </footer>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
