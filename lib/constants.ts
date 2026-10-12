// Values that are fixed by the business rather than entered by the
// client in the admin area.
//
// Nothing in here is trip content. No trip, image, category or price for
// a trip ever lives in code: those all come from the database. What lives
// here is brand information, the seat hold rule, and the human-readable
// labels for the enum values in schema.prisma.

import {
  BookingStatus,
  DepartureStatus,
  TripType,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------
// Taken from the public Queen Bees Instagram profile (@queenbees_tvm).
// CONFIRM ALL OF THIS WITH THE CLIENT before launch, especially the
// phone number.
//
// If the client wants to edit any of it without a deploy, these move to
// a SiteSettings table in Phase 5. Right now they change about once a
// year, so a constant is honest.
export const BUSINESS_NAME = "Queen Bees Travels";
export const BUSINESS_TAGLINE = "Her Travel Partner";
export const BUSINESS_DESCRIPTION =
  "An exclusive ladies-only travel group based in Trivandrum, running weekend getaways, All-India journeys and international trips since 2019.";
export const BUSINESS_CITY = "Trivandrum";
export const BUSINESS_FOUNDED_YEAR = 2019;

// Most enquiries arrive on WhatsApp, so the phone number is the primary
// call to action on every page.
// Home page hero copy. It lives here rather than inside the component
// because it is the single most argued-over text on the site and the
// client will want it changed. Phase 5 can move these to a SiteSettings
// table so she can edit them herself without a deploy.
export const HERO_HEADLINE_LEAD = "You belong out there.";
export const HERO_HEADLINE_TAIL = "And you belong with us.";
export const HERO_SUBHEAD =
  "Since 2019, women have been joining us for weekend escapes, journeys across India and trips abroad. We pick you up in Trivandrum and drop you back, so all you have to do is come.";

export const BUSINESS_PHONE = "+919995741443";
export const BUSINESS_PHONE_DISPLAY = "+91 99957 41443";
export const BUSINESS_WHATSAPP_URL = "https://wa.me/919995741443";
export const BUSINESS_INSTAGRAM_URL = "https://www.instagram.com/queenbees_tvm/";
export const BUSINESS_INSTAGRAM_HANDLE = "@queenbees_tvm";

// The registered address, as it appears on the company's own listing.
// CONFIRM WITH THE CLIENT before launch: a wrong address on a travel
// site sends someone to the wrong place on the morning of a trip.
export const BUSINESS_ADDRESS_LINES = [
  "Anayara Rd, Kudavoor, Kallummoodu",
  "Pettah, Thiruvananthapuram",
  "Kerala 695029",
];

// Built from the address rather than a saved place id, so correcting the
// address above also corrects the map link and the two cannot drift.
export const BUSINESS_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `Queen Bees Travels, ${BUSINESS_ADDRESS_LINES.join(", ")}`,
)}`;

export const BUSINESS_OPENING_HOURS = "Opens 9 am, closes 6 pm";

// ---------------------------------------------------------------------
// Seat holds
// ---------------------------------------------------------------------
// A pending booking holds its seats for this long while the customer
// pays. After this the hold lapses and the seats are available again.
// See lib/availability.ts for how this is applied.
export const SEAT_HOLD_MINUTES = 15;

// Razorpay works in paise. We store whole rupees everywhere else and
// multiply by this only when calling their API.
export const PAISE_PER_RUPEE = 100;

// Every booking reference starts with this, so a reference is
// recognisable in a WhatsApp message: QB-7F3K2M
export const BOOKING_REF_PREFIX = "QB";

// ---------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------
// The enum values in schema.prisma are lower snake_case so that one
// spelling works as a database value and a URL filter value. These are
// the versions a customer or the client should see.

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  ladies_only: "Ladies only",
  mixed: "Mixed group",
  mother_and_kids: "Mothers and kids",
};

export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  open: "Open for booking",
  closed: "Closed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Hold expired",
  refunded: "Refunded",
};

// ---------------------------------------------------------------------
// Trip listing filters
// ---------------------------------------------------------------------
// These are filter controls, not trip content, which is why the numbers
// are allowed to live in code. A trip's actual price always comes from
// its Departure rows.
//
// `id` is what appears in the URL as ?price=under-10k. maxRupees of null
// means no upper limit.
export const PRICE_BANDS = [
  { id: "under-10k", label: "Under 10,000", minRupees: 0, maxRupees: 9999 },
  { id: "10k-25k", label: "10,000 to 25,000", minRupees: 10000, maxRupees: 25000 },
  { id: "25k-50k", label: "25,000 to 50,000", minRupees: 25001, maxRupees: 50000 },
  { id: "above-50k", label: "Above 50,000", minRupees: 50001, maxRupees: null },
];

// Shown in the month filter on the trip listing. Index 0 is January, to
// match the month number that Date.getMonth() returns.
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Below this many seats left, the trip detail page shows an urgency note
// instead of a plain number.
export const LOW_SEAT_WARNING_THRESHOLD = 4;
