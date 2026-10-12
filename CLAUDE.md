@AGENTS.md

# Queen Bees Travels

A ladies-only travel company in Trivandrum, Kerala, operating since 2019.
Weekend trips, All-India trips and international trips, with pickup and
drop in Trivandrum.

This is a live client project. Real customers, real money, real personal
data. Customer records here are women's names, phone numbers and travel
dates. Treat all of it as sensitive.

It must work correctly, not just look finished.

## Who maintains this

One developer, working alone, with about a year of professional
experience. Every line has to be understandable at 2am with a bug in
production. That is the standard for all code in this repository.

## How to write code here

- No abstraction until the same pattern appears three times. Duplicated
  code that reads clearly beats a clever helper that doesn't.
- No barrel files. No higher-order components. No custom hooks unless a
  hook is genuinely the only option. No generics beyond basic typing.
- Named functions over inline arrow functions for anything longer than
  one line.
- No nested ternaries. Use if/else, even when it is longer.
- Descriptive names. `availableSeats`, not `n`. `departureId`, not `id`
  when there are three kinds of id in scope.
- Comments explain WHY, never WHAT. "Razorpay works in paise, we store
  rupees" is useful. "loop through trips" is noise.
- One concern per file. A file that does two things gets split.
- Keep files under 200 lines. If one grows past that, say so and suggest
  how to split it rather than splitting it silently.

## How to keep it debuggable

- Every API route wraps its body in try/catch, logs the real error with
  context, and returns a generic message to the client. Never swallow an
  error silently.
- Validate every request body with zod at the top of the route. Return
  the validation errors in development only.
- Log every money operation: order created, signature verified, webhook
  received, booking confirmed, refund issued. Include the booking
  reference in every log line so one booking can be traced through the
  whole flow.
- Error messages say what went wrong AND what to check. "Departure not
  found: <id>" beats "Something went wrong".
- When something can fail in two different ways, handle them separately
  so the logs say which one happened.

## Non-negotiable rules

These are security rules, not style preferences. Do not violate them
even if asked to.

1. NEVER take a payment amount from the request body. Look up the
   Departure server-side and compute the amount from `pricePerPerson`
   and `advanceAmount`. A client-supplied amount is an exploit.
2. Verify the Razorpay signature with HMAC SHA256 server-side before
   marking any booking paid. Use the RAW request body for webhook
   verification, never the parsed JSON.
3. `RAZORPAY_KEY_SECRET` and `SESSION_SECRET` must never be prefixed
   `NEXT_PUBLIC_` and never imported into a "use client" file.
4. No booking data on any public route.
5. Public pages read ALL content from the database. Never hardcode a
   trip, image, category or price into a component. The client adds
   everything through the admin dashboard.
6. Always run `npx prisma@7`, never bare `npx prisma`. Bare installs the
   v8 release candidate, which cannot read this schema.
7. Store money as integers in rupees. Multiply by 100 only at the
   Razorpay API boundary.

## Seat availability

Available seats = `totalSeats` − `seatsConfirmed` − seats held by pending
bookings whose `expiresAt` is still in the future. Pending bookings hold
their seats for 15 minutes.

Check availability TWICE: once when creating the Razorpay order, and
again in the webhook before confirming. If the second check fails,
refund automatically. This is what stops a trip being oversold when two
people book the last seats at the same moment.

Fullness is never stored. It is computed from seats every time. See
`lib/availability.ts`.

## Build order

Phase 1  Foundation: lib/ and prisma/seed.ts                    DONE
Phase 2  Design system, header, footer, root layout             DONE
Phase 3  Public pages: home, trip listing with filters, trip      DONE
         detail. Plus Review, Faq and SiteSetting models for the
         social proof and FAQ sections.
         Phase 5 owes admin screens for reviews, questions and site
         settings. A Workshops section is still undecided: a workshop
         is neither a trip nor a departure in the current schema.
Phase 3  Public pages: home, trip listing with filters, trip detail
Phase 4  Booking and payment                                     DONE
         Originally reserved for the project owner; built by AI at
         the owner's explicit request. Everything in it is covered by
         check scripts, because none of it can be eyeballed.
         Outstanding: the automatic refund path needs real Razorpay
         test keys to exercise, and a pending-booking sweeper would
         tidy expired holds that currently just stop counting.
Phase 5  Admin: login, bookings dashboard, CSV export, trip and     DONE
         departure CRUD, image upload, waitlist, enquiries, plus
         reviews, questions and site settings.
         Outstanding: image upload writes to the local disk and
         therefore does NOT work in production; it needs an object
         storage service. See lib/image-storage.ts, which is the only
         file that has to change.

Stop at the end of each phase and wait before starting the next one.

## Rendering and images

Every page that shows seats remaining declares
`export const dynamic = "force-dynamic"`. Seat counts change the moment
somebody books, and a statically built page would tell a visitor three
seats are left when the trip is full. That is a refund and an apology,
not a stale-cache annoyance. It also means a production build never
touches the database.

CSS base styles in `app/globals.css` must stay inside `@layer base`.
Unlayered CSS outranks every layered rule, so a bare `h2 { color }`
there silently beats `class="text-white"` on that same heading.

Trip photographs live in `public/images/` and are referenced from
`Trip.images` in the database, never hardcoded in a component. The logo
is `public/logo.png`, the bee mark `public/bee.png`, and the browser
icons are `app/icon.png` and `app/apple-icon.png`.

Any text sitting over a photograph needs a scrim that works for the
worst photo the client might upload, not just the one in front of you.
Both photo heroes were set by sampling the composited pixels, including
against a hypothetical solid white upload, and both clear their
requirement in that worst case.

RE-MEASURE after changing a hero image. Swapping to the sunrise photo
showed why: it cleared everything comfortably, while the mobile scrim
underneath it would still have failed a plain bright photograph on the
header nav and the eyebrow. A scrim that passes for the picture in
front of you is not the same as a scrim that passes.

The home hero photo is 2.19:1, far wider than any screen, so
object-cover crops its SIDES and the vertical half of object-position
does almost nothing. The horizontal half is what matters: it is set
right of centre so the sunrise lands in the clear half beside the text
rather than behind it.

Darken by POSITION, never uniformly. An even wash heavy enough to be
safe everywhere turns a green hillside to grey mush, and the photograph
is half the reason anyone stays. The home hero uses a vertical gradient
for the header band and the bottom edge, plus a horizontal one behind
the text on desktop, which leaves the right side of the picture
untouched. On a phone the text is full width so a single vertical
gradient is the honest answer.

When measuring contrast over a photo, measure the GLYPH boxes, not the
element box. A block paragraph stretches to its container width, so
sampling its rectangle reports the darkest pixel in empty space beside
the text and reports failures that are not real. Use a Range over the
text nodes and its client rects.

`components/site-header.tsx` is the only client component on the public
site. The header sits transparently over the hero and fills in on
scroll, and no CSS available in Safari today can read scroll position.
Everything else is a server component; keep it that way.

Home page sections alternate white and warm grey, and that rhythm is
the main thing stopping a long page reading as one undifferentiated
scroll. A new section goes in whichever colour continues the
alternation. The background belongs on the section itself, not on a
wrapper, because a wrapper's colour is simply hidden by the section's
own.

## The admin area

Everything under `/admin` holds women's names, phone numbers and travel
dates, so it is all behind a session.

The layouts are split by route group. `app/layout.tsx` carries only the
html element, the fonts and the metadata. The public header and footer
live in `app/(public)/layout.tsx`, and the admin chrome in
`app/admin/(dashboard)/layout.tsx`. The brackets keep both out of the
url. This exists because a layout applies to everything beneath it, and
without the split every admin screen would render a "Plan your trip on
WhatsApp" button above the bookings table.

The sign-in page sits at `app/admin/login`, deliberately OUTSIDE the
`(dashboard)` group, so it is not behind the guard that would otherwise
redirect it to itself forever.

Two different guards, and using the wrong one is a real bug:

- PAGES call `requireAdmin()`, which redirects to the login page.
- ROUTE HANDLERS call `getApiAdmin()` and return 401 themselves.
  `requireAdmin()` redirects by throwing a control-flow error, and a
  route's own try/catch catches that and turns it into a 500. The CSV
  export did exactly this: safe, but it reported the wrong thing.

Every page calls the guard itself AND the layout calls it, so a page
added later that forgets the call is still unreachable.

Two things the admin deliberately cannot do:

- `seatsConfirmed` is never editable. It is maintained by the webhook
  when a payment is confirmed, and a typo there would oversell a coach.
  Reducing a departure's total seats below what is already confirmed is
  refused for the same reason.
- Trips and departures with bookings are never deleted. A trip is
  hidden with its active flag; a full departure is set to cancelled.

Run `npm run check:admin-auth` after touching any of it. It signs out,
confirms every screen and the CSV export are blocked, checks that a
wrong password and an unknown email give the identical message, then
signs in and confirms everything loads.

## Secrets

Real credentials go in `.env` and `.env.neon`. Both are gitignored.

`.env.example` is COMMITTED. It exists to show the shape of each value
and must only ever contain placeholders. Filling a real key into it is
the easiest mistake to make here, because it sits right next to `.env`
in an editor's file list and the two look almost identical.

Before every commit, and certainly before any push after adding real
keys:

    npm run check:secrets

It scans everything git can see, ignores the vendored Prisma docs, and
never prints a secret it finds, only the file and line. Printing one
into a terminal puts it in your shell history and your scrollback,
which turns one leak into two.

If something did reach a tracked file: move it to `.env`, then ROTATE
it in the Razorpay dashboard. Removing it from the file is not enough
once it has been committed, because it stays in the git history.

## Booking and payment

The money path, in the order it runs:

1. `POST /api/bookings` validates, locks the departure row, checks
   seats, computes the charge from the Departure row and writes a
   PENDING booking. Then it creates the Razorpay order OUTSIDE the
   transaction, because holding a row lock across a call to another
   company blocks every other booking on that departure.
2. The browser opens Razorpay checkout and `POST /api/payments/verify`
   reports honestly whether it worked. It confirms NOTHING.
3. `POST /api/webhooks/razorpay` is the only authority. It verifies the
   raw body, re-checks seats under a lock, and either confirms or
   refunds.

Things that will break if changed carelessly:

- The charge comes from `lib/booking-pricing.ts`, whose signature has
  no parameter a request body could reach. That is rule 1 expressed as
  a type rather than as a comment.
- The webhook reads `await request.text()` BEFORE parsing. Parsing
  first and re-serialising changes the bytes and no signature will
  ever match again.
- The webhook must stay idempotent. Razorpay retries, and a second
  confirmation would add the same seats twice.
- The confirm-time seat check passes the booking's own id to
  `getDepartureAvailabilityForUpdate` so its hold is not counted
  against itself. Without that, every booking looks like it oversells
  the trip and gets refunded.
- If Razorpay will not create an order, the pending booking is
  cancelled immediately. Otherwise it would hold seats for fifteen
  minutes with no way for anyone to pay.

Run `npm run check:payment-security` and `npm run check:webhook` after
touching any of it. The second one needs the dev server running and
forges its own signatures, so it needs no Razorpay account.

### Which payment methods appear

The checkout options in `lib/razorpay-checkout.ts` set no `method`
restriction, so whatever is enabled on the Razorpay account shows up
automatically and nothing in this codebase can hide a method.

`npm run check:razorpay` reports which ones are actually on. A new
Razorpay account often has UPI switched OFF while cards work, which
looks exactly like a bug in the site and is not one. The toggle is in
the dashboard under Account & Settings, Payment Methods, and may be
unavailable until activation and KYC are complete.

UPI matters more than anything else here: it is how most people in
India pay, so launching without it would lose most bookings.

### Testing payments locally

Creating an order and opening the Razorpay sheet needs only
`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. The webhook plays no part
in that.

But nothing CONFIRMS a booking except the webhook. Without one a
customer pays, the hold expires fifteen minutes later, and the seat is
released with the money taken. So the webhook is not optional for a
working flow, only for watching the payment sheet open.

Razorpay cannot reach localhost, so no real webhook ever arrives in
development. Rather than weaken the server with a development-only
confirm path, which is the kind of thing that ships by accident, pay
with a test card in the browser and then finish the flow by hand:

    npm run webhook:simulate -- QB-7F3K2M

That sends the real event with a real signature. It signs with the same
`RAZORPAY_WEBHOOK_SECRET` the route verifies against, so it works even
while that value is still a placeholder: both sides only have to agree
with each other.

Before going live, create the webhook in the Razorpay dashboard
pointing at `/api/webhooks/razorpay`, subscribed to `payment.captured`
and `payment.failed`, and put its own signing secret in
`RAZORPAY_WEBHOOK_SECRET`. That secret is NOT the key secret.

## Trip listing filters

Filters live in the query string, never in component state. That is what
makes a filtered listing bookmarkable, shareable on WhatsApp and
reachable by the back button, and it keeps the page a server component.

The filter bar is a plain `<form method="get">`, so it works while
JavaScript is still loading, which on mobile data is a real moment. The
cost is that changing a dropdown does nothing until you press the
button, which is the honest trade for not shipping a client component.

Every value arriving from the url is untrusted and is checked against a
known list in `lib/trip-filters.ts`. Anything unrecognised becomes null
rather than reaching a query. Months are validated against the months
actually on offer, not merely against the YYYY-MM shape: honouring a
well-formed but unselectable month would empty the page while every
dropdown still read "Any month".

Category and trip type narrow which TRIPS match. Month and price narrow
which DEPARTURES match, so a trip with no matching date disappears from
a filtered listing but a trip with no dates at all still belongs on an
unfiltered one.

A `<footer>` inside a list item binds to the nearest sectioning element,
not to the item. Review cards are therefore `<article>`, so their
attribution footer belongs to that one review instead of giving the
reviews section six footers and making the page footer ambiguous.

No review, rating, review count or follower number is ever written into
a component. They are real claims about real people, they go stale, and
they come from `Review` and `SiteSetting`. A section whose data is
missing renders nothing rather than an empty shell.

## Local development

The database is the PostgreSQL 18 Windows service, `postgresql-x64-18`.
It starts with the machine, so there is nothing to start by hand. The
project has its own database and role on it, `queen_bees`, so it cannot
reach the other databases on that server.

    npx prisma@7 db push
    npx prisma@7 generate
    npx prisma@7 db seed
    npm run dev

The generated Prisma client lands in `generated/prisma/` and is not
committed.

This replaced `npx prisma@7 dev`, which ran pglite, a Postgres compiled
to WebAssembly and hosted inside Node. It dropped its connections every
few days with "Connection terminated unexpectedly" or "Server has
closed the connection", and the only cure was to delete the instance
and reseed, which threw away everything entered since. pglite keeps its
working set in memory, and this machine runs with very little free, so
it was never going to be stable here. Do not go back to it. If
`npx prisma@7 dev` is ever run again it starts a SECOND, unrelated
database on another port and nothing will be where you left it.

### Never lose local content again

    npm run db:backup     writes every row to db-backups/<timestamp>.json
    npm run db:restore    loads the newest one back

A snapshot is a plain JSON file you can open and read. Both commands
refuse any host that is not localhost, because a snapshot of production
would put real customers' names and phone numbers in a file on a
laptop.

`npm run db:reset` empties every table and reseeds, for when you want a
known starting point. It takes a snapshot first, so a reset you did not
mean is undone with `npm run db:restore`.

It empties the tables rather than running `prisma db push --force-reset`
because Prisma 7 refuses that from a script without a consent token, and
putting that token in a committed file would switch the guard off for
every future run.

`db-backups/` is gitignored. A snapshot holds customer-shaped rows and
the dev admin's password hash, so it never belongs in git.

Check scripts pick their test data by SHAPE, never by a hardcoded slug:
a departure with at least three seats free, a departure with none. Seed
content changes, and a check that breaks whenever someone renames a trip
is a check people start ignoring. Run `npm run db:where` to confirm the
database is healthy before trusting a failure.

## Production database

Production is Neon Postgres in `ap-southeast-1`, Singapore. The region
was chosen to sit close to Kerala; a Neon project's region cannot be
changed afterwards, so do not move it casually.

Neon hands out two connection strings for the same database and they
are not interchangeable:

- The POOLED string, whose host contains `-pooler`, goes in
  `DATABASE_URL` in the deployment host only. The running application
  uses it.
- The DIRECT string, whose host does not, goes in
  `DIRECT_DATABASE_URL` in `.env.neon` only. Schema pushes use
  it, because the pooler cannot run their statements.

The file is called `.env.neon` and NOT `.env.production` for a reason.
Next.js automatically loads `.env.<NODE_ENV>`, so a file named
`.env.production` is read by every `next build` and `next start`. From
Phase 3 onwards pages read the database while they are being built, so
a production connection string sitting in that file would mean building
the site on a laptop quietly generated pages against live customer
data. The odd name keeps the credential out of Next's reach entirely.
Do not rename it back.

There are two Prisma config files and the difference matters:

- `prisma7.config.ts` is the default and can only reach the LOCAL
  database. Every ordinary command uses it.
- `prisma-prod.config.ts` reaches production and is used only when
  named on the command line.

So this always goes to the local database:

    npx prisma@7 db push

And this is the only way to reach production:

    npx prisma@7 db push --config prisma-prod.config.ts

The production config refuses a pooled url, refuses localhost, and
prints the host it is about to touch before doing anything.

Never run `prisma db seed` against production. The seed creates a
development admin whose password is published in `prisma/seed.ts`, and
it now refuses any host that is not local unless explicitly overridden.

## Telling local and production apart

Four ways, in order of how often you will use them.

1. Run `npm run db:where`. It prints both databases side by side with
   their hostnames and row counts, plus which commands reach which.
   Read only, safe any time.

2. Read the `[prisma]` line printed when the server starts. It names
   the host and says `LOCAL database` or `REMOTE database, this is real
   customer data` before any query runs.

3. Look at the command. No `--config` flag means local, always. Only
   `--config prisma-prod.config.ts` reaches production, and it prints
   the host it is about to touch first.

4. Look at the hostname anywhere it appears. `localhost:5432` is the
   local database. Anything ending `.aws.neon.tech` is production.

The quick rule: local has the placeholder trip and the dev admin in it.
Production should have no trips and no admin until the client enters
real content. If production ever shows a trip called PLACEHOLDER, the
seed was run against the wrong database.

### The local database is not in Neon

It never will be. The local database is a Postgres service running on
this machine, storing its files on this disk. Neon has no knowledge of
it. The Neon console therefore shows production and nothing else, which
is useful: anything you see in Neon is real.

pgAdmin is installed alongside that service and will show the
`queen_bees` database next to the other projects on the same server.
That view is local, always.

To browse local data the way Neon's Tables view shows production, use
Prisma Studio:

    npm run db:studio

That opens a table browser at http://localhost:5555 against the LOCAL
database. There is deliberately no short script for the production
equivalent. If you genuinely need to inspect live customer data, type
it out:

    npx prisma@7 studio --config prisma-prod.config.ts

Studio can edit and delete rows, so against production that is a
careful, deliberate act, not a convenience.
