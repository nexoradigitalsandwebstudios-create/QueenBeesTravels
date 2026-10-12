import Image from "next/image";
import Link from "next/link";

import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_CITY,
  BUSINESS_FOUNDED_YEAR,
  BUSINESS_INSTAGRAM_HANDLE,
  BUSINESS_INSTAGRAM_URL,
  BUSINESS_MAP_URL,
  BUSINESS_NAME,
  BUSINESS_OPENING_HOURS,
  BUSINESS_PHONE,
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_TAGLINE,
  BUSINESS_WHATSAPP_URL,
} from "@/lib/constants";

const EXPLORE_LINKS = [
  { href: "/trips", label: "All trips" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#reviews", label: "Reviews" },
];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">
      {children}
    </h2>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.06-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23m-3.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.13.18 1.76 2.7 4.28 3.78 1.5.65 2.1.7 2.85.6.46-.07 1.48-.6 1.69-1.2.2-.58.2-1.08.14-1.19-.06-.1-.23-.16-.48-.28-.25-.13-1.48-.73-1.71-.82-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.98-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.1-.51.12-.11.26-.29.38-.44.13-.15.17-.25.26-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.55-.42z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path
        fill="currentColor"
        d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2m0 1.8c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17C2.4 10.1 2.4 10.46 2.4 12s0 1.9.06 3.14c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-3.14s-.01-1.9-.07-3.14c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4C15.5 4.01 15.14 4 12 4m0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88m0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28m5.14-3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-ink-900 text-ink-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo.png"
              alt=""
              width={96}
              height={96}
              className="h-20 w-20 rounded-full bg-white object-contain"
            />
            <p className="mt-5 font-display text-xl font-semibold text-white">
              {BUSINESS_NAME}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-gold-300">
              {BUSINESS_TAGLINE}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
              Exclusive ladies-only travel group. Pickup and drop at{" "}
              {BUSINESS_CITY}. Since {BUSINESS_FOUNDED_YEAR}. Weekend, All India
              and international trips.
            </p>
          </div>

          <div>
            <ColumnHeading>Visit us</ColumnHeading>
            {/* A real postal address is the single clearest signal that a
                travel company is a real company, which is most of what a
                woman deciding to travel with strangers is looking for. */}
            <address className="mt-4 text-sm not-italic leading-relaxed text-ink-300">
              {BUSINESS_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={BUSINESS_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 hover:text-gold-300"
            >
              Get directions
            </a>
            <p className="mt-2 text-sm text-ink-300">
              {BUSINESS_OPENING_HOURS}
            </p>
          </div>

          <div>
            <ColumnHeading>Talk to us</ColumnHeading>
            <ul className="mt-3 text-sm">
              <li>
                <a
                  href={BUSINESS_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2.5 text-ink-200 no-underline hover:text-gold-300"
                >
                  <WhatsAppIcon />
                  {BUSINESS_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS_INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2.5 text-ink-200 no-underline hover:text-gold-300"
                >
                  <InstagramIcon />
                  {BUSINESS_INSTAGRAM_HANDLE}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${BUSINESS_PHONE}`}
                  className="inline-flex min-h-11 items-center gap-2.5 text-ink-200 no-underline hover:text-gold-300"
                >
                  Call {BUSINESS_PHONE_DISPLAY}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <ColumnHeading>Explore</ColumnHeading>
            <ul className="mt-3 text-sm">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-ink-200 no-underline hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* No year here deliberately. A year rendered at build time goes
            stale the moment the calendar turns and nobody redeploys,
            which is a confusing thing to debug for a one word gain. */}
        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {BUSINESS_NAME}, {BUSINESS_CITY}.
          </p>
          <p>
            Ladies only &middot; Travelling together since{" "}
            {BUSINESS_FOUNDED_YEAR}
          </p>
        </div>
      </div>
    </footer>
  );
}
