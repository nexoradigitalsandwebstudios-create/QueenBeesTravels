import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import {
  BUSINESS_DESCRIPTION,
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
} from "@/lib/constants";

import "./globals.css";

// This layout holds ONLY what both the public site and the admin area
// share: the html element, the fonts and the default metadata.
//
// The public header and footer live in app/(public)/layout.tsx instead.
// They used to be here, which meant every admin screen would have
// rendered a "Plan your trip on WhatsApp" button above the bookings
// table. A layout applies to everything beneath it, so the only way to
// have two different chromes is to have two layouts.
//
// (public) is a route group: the brackets keep it out of the url, so
// app/(public)/page.tsx is still the home page at /.

// Fraunces for display, DM Sans for everything else. This is the
// pairing the client has already seen on the demo site.
//
// Fraunces is a variable font with a SOFT axis and optical sizing. The
// soft axis is what stops the serif reading as stern and newspapery,
// which is exactly the difference between "trustworthy" and "dull" for
// this brand. It has to be requested explicitly: next/font only ships
// the axes you name.
//
// next/font downloads both at build time and self-hosts them, so a
// visitor's phone makes no request to Google and sees no layout shift.
const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-serif",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS_NAME} | ${BUSINESS_TAGLINE}`,
    // Page titles fill the %s. Set `title` in a page to use it.
    template: `%s | ${BUSINESS_NAME}`,
  },
  description: BUSINESS_DESCRIPTION,
  // Trips are shared on WhatsApp far more than anywhere else here, and
  // WhatsApp reads these tags to build its link preview. Without them a
  // shared trip link shows as a bare url.
  openGraph: {
    title: `${BUSINESS_NAME} | ${BUSINESS_TAGLINE}`,
    description: BUSINESS_DESCRIPTION,
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      {/* min-h-dvh rather than min-h-screen: on a phone, 100vh sits
          behind the browser's own toolbar and pushes the footer off. */}
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
