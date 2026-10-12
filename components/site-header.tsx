"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
  BUSINESS_WHATSAPP_URL,
} from "@/lib/constants";

// This is the one client component on the public site, and it earns it.
//
// The header sits transparently over the full-screen hero photograph and
// fills in with white once you scroll past it. There is no way to know
// the scroll position in CSS that works in Safari today: scroll-driven
// animations are the CSS answer and they are too new to rely on, and
// every visitor here is on a phone. So this reads the scroll position in
// about fifteen lines of JavaScript.
//
// Everything else on the site is a server component.

// Links beginning with "/#" work from any page: on the home page the
// browser jumps to the section, from a trip page it navigates home and
// then jumps. A bare "#reviews" would do nothing on /trips.
const NAV_LINKS = [
  { href: "/trips", label: "Trips" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#contact", label: "Contact" },
];

// Roughly the height of the header itself. Below this the hero is still
// behind the header, so it stays transparent.
const SCROLL_THRESHOLD_PX = 80;

export function SiteHeader() {
  const pathname = usePathname();
  // Only the home page has a full-bleed photo for the header to sit on.
  const overlaysHero = pathname === "/";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!overlaysHero) {
      return;
    }

    function handleScroll() {
      // Compare against the current state through the setter so this
      // listener never needs isScrolled in its dependencies, and so it
      // only re-renders when the answer actually changes rather than on
      // every pixel of a scroll.
      const scrolledNow = window.scrollY > SCROLL_THRESHOLD_PX;
      setIsScrolled((wasScrolled) =>
        wasScrolled === scrolledNow ? wasScrolled : scrolledNow,
      );
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [overlaysHero]);

  // An open menu panel hangs below the bar, so the bar has to be solid
  // even at the top of the hero or the panel appears to float.
  const isTransparent = overlaysHero && !isScrolled && !isMenuOpen;

  let headerSkin = "border-b border-border/80 bg-surface/95 backdrop-blur-md";
  if (isTransparent) {
    headerSkin = "border-b border-transparent bg-transparent";
  }

  let textColour = "text-text";
  let brandColour = "text-ink-900";
  let taglineColour = "text-magenta-600";
  if (isTransparent) {
    textColour = "text-white/90";
    brandColour = "text-white";
    taglineColour = "text-white/75";
  }

  return (
    <>
      {/* The height lives on the <header> so the border-b counts inside
          it: Tailwind is border-box, so h-16 really is 64px all in. The
          spacer at the bottom of this file repeats these two values and
          must keep matching them. Before this the bar grew to fit a full
          row of nav links on a phone, reaching 121px against a hardcoded
          86px spacer, and the top 35px of every page sat behind it. */}
      <header
        className={`fixed inset-x-0 top-0 z-50 h-16 transition-colors duration-500 sm:h-20 ${headerSkin}`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-magenta-600 focus:px-4 focus:text-base focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        <div className="mx-auto flex h-full max-w-7xl items-center gap-x-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-md no-underline"
          >
            <Image
              src="/logo.png"
              alt=""
              width={56}
              height={56}
              priority
              className="h-11 w-11 shrink-0 rounded-full bg-white object-contain sm:h-14 sm:w-14"
            />
            <span className="flex flex-col leading-none">
              <span
                className={`font-display text-xl font-semibold tracking-tight transition-colors duration-500 sm:text-2xl ${brandColour}`}
              >
                {BUSINESS_NAME.replace(" Travels", "")}
              </span>
              <span
                className={`mt-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] transition-colors duration-500 ${taglineColour}`}
              >
                {BUSINESS_TAGLINE}
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden sm:ml-10 sm:mr-auto sm:block">
            <ul className="flex items-center gap-x-6 text-sm font-semibold">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`inline-flex min-h-11 items-center no-underline transition-colors duration-500 hover:text-magenta-500 ${textColour}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <a
              href={BUSINESS_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-magenta-600 px-4 text-sm font-semibold text-white no-underline shadow-brand transition-colors duration-200 hover:bg-magenta-700 sm:px-5"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.06-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23m-3.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.13.18 1.76 2.7 4.28 3.78.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.48-.6 1.69-1.2.2-.58.2-1.08.14-1.19-.06-.1-.23-.16-.48-.28-.25-.13-1.48-.73-1.71-.82-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.98-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.1-.51.12-.11.26-.29.38-.44.13-.15.17-.25.26-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.55-.42z"
                />
              </svg>
              <span className="hidden sm:inline">WhatsApp Us</span>
              <span className="sm:hidden">Chat</span>
            </a>

            {/* 44x44 is the smallest thing a thumb hits reliably, so the
                box is sized rather than padded. */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-500 sm:hidden ${textColour}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d={isMenuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Always rendered so aria-controls always points at something,
            and hidden with a class rather than unmounted. It hangs below
            the bar, which is what top-full means against the fixed
            header. */}
        <div
          id="mobile-nav"
          className={`absolute inset-x-0 top-full border-b border-border bg-surface shadow-lifted sm:hidden ${isMenuOpen ? "block" : "hidden"}`}
        >
          <nav aria-label="Main" className="mx-auto max-w-7xl px-4">
            <ul className="flex flex-col py-2 text-base font-semibold">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex min-h-12 items-center text-text no-underline hover:text-magenta-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* The header is fixed, so it is out of the document flow. On the
          home page the hero deliberately runs underneath it. Every other
          page needs something to stand in for its height, or the first
          heading sits behind it.

          These two heights MUST stay equal to the bar's h-16 sm:h-20
          above. They are the same numbers written twice, and that is the
          whole bug this replaced: a spacer that guessed. */}
      {overlaysHero ? null : <div aria-hidden="true" className="h-16 sm:h-20" />}
    </>
  );
}
