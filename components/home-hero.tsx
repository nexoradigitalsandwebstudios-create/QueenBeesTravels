import Image from "next/image";
import Link from "next/link";

import {
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
  BUSINESS_WHATSAPP_URL,
  HERO_HEADLINE_LEAD,
  HERO_HEADLINE_TAIL,
  HERO_SUBHEAD,
} from "@/lib/constants";

// Full viewport height, photograph edge to edge, text sitting at the
// bottom. The earlier version put the photo in a small frame beside the
// text, which is safe and forgettable. A travel site is selling the
// feeling of being somewhere else, and that needs the picture to be the
// whole screen.
//
// 100svh rather than 100vh: on a phone, vh is measured against the
// viewport with the browser toolbar hidden, so a 100vh hero is always
// slightly taller than the screen and the first thing a visitor does is
// discover the page is already scrolled.
export function HomeHero() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink-900">
      <Image
        src="/images/hero.png"
        alt="Sunrise over tea plantations and a lake in the Kerala hills"
        fill
        priority
        sizes="100vw"
        // This photograph is 2.19:1, far wider than any screen it will
        // land on, so object-cover crops the SIDES rather than the top
        // and bottom. Biasing right keeps the sunrise in frame on a
        // desktop, where it sits in the clear half of the picture beside
        // the text rather than behind it.
        className="object-cover [object-position:60%_50%]"
      />

      {/* The scrim is deliberately light at the top and heavy at the
          bottom. An even wash dark enough to be safe everywhere turns a
          lush green hillside into grey mush, and the photograph is half
          the reason anyone stays on the page.

          Text only ever sits in the bottom portion, so that is where the
          weight goes. The thin flat layer keeps a floor under the whole
          thing for whatever photograph the client uploads next. All
          three values were set by measuring the composited pixels, not
          by eye. */}
      {/* Darkening by POSITION rather than uniformly. An even wash heavy
          enough to be safe everywhere turns a green hillside to grey
          mush, and the photograph is half the reason anyone stays.

          On desktop the text occupies the left side, so the right side
          needs no scrim at all and stays fully vivid. The vertical layer
          only has to cover the header band at the top and the bottom
          edge; the horizontal layer does the work behind the text.

          On a phone the text is full width, so there is no clear side to
          protect and a single vertical gradient is the honest answer.

          Every stop was set by sampling the composited pixels, including
          against a hypothetical solid white upload, not by eye. */}
      <div className="absolute inset-0 bg-ink-900/10" />

      <div
        className="absolute inset-0 sm:hidden"
        style={{
          // Flatter and stronger than the desktop pair, because on a
          // phone the text runs from 8% to 85% of the hero and there is
          // no clear band left to protect. Measured so that even a solid
          // white photograph keeps the small text above 4.5:1; the old
          // values cleared this picture but would have failed a bright
          // one, which is exactly the upload nobody checks.
          backgroundImage:
            "linear-gradient(to bottom, rgba(28,28,28,0.80) 0%, rgba(28,28,28,0.58) 18%, rgba(28,28,28,0.56) 45%, rgba(28,28,28,0.90) 100%)",
        }}
      />

      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(28,28,28,0.70) 0%, rgba(28,28,28,0.10) 20%, rgba(28,28,28,0.10) 58%, rgba(28,28,28,0.48) 100%)",
        }}
      />
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(28,28,28,0.80) 0%, rgba(28,28,28,0.72) 34%, rgba(28,28,28,0.38) 58%, rgba(28,28,28,0) 76%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24 lg:px-8 lg:pb-28">
        <div className="max-w-3xl">
          <p className="hero-rise text-xs font-medium uppercase tracking-[0.28em] text-white/85">
            {BUSINESS_NAME.replace(" Travels", "")} &middot; {BUSINESS_TAGLINE}
          </p>

          <h1
            className="hero-rise mt-5 text-[2.75rem] leading-[1.02] text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.1s" }}
          >
            {HERO_HEADLINE_LEAD}
            {/* The second line goes light and italic, and the last two
                words get a magenta rule under them. One typographic
                gesture carries the brand without a single extra pixel of
                chrome. */}
            <span className="mt-2 block font-light italic text-white/95">
              {HERO_HEADLINE_TAIL.replace(" with us.", " ")}
              <span className="underline decoration-magenta-500 decoration-[3px] underline-offset-[10px]">
                with us
              </span>
              .
            </span>
          </h1>

          <p
            className="hero-rise mt-7 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
            style={{ animationDelay: "0.25s" }}
          >
            {HERO_SUBHEAD}
          </p>

          <div
            className="hero-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "0.4s" }}
          >
            <a
              href={BUSINESS_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-magenta-600 px-7 text-base font-semibold text-white no-underline shadow-brand transition-colors duration-200 hover:bg-magenta-700"
            >
              Plan your trip on WhatsApp
            </a>
            <Link
              href="/trips"
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 text-base font-semibold text-white no-underline backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
            >
              Explore trips
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
