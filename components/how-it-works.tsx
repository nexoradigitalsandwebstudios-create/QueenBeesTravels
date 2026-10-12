import { BUSINESS_CITY, BUSINESS_WHATSAPP_URL } from "@/lib/constants";

// Booking a trip with strangers is the part people hesitate over, so the
// page spells out exactly what happens. These four steps describe the
// real flow once Phase 4 is live: pick a date, pay the advance, seat
// held, picked up.
const STEPS = [
  {
    title: "Pick a trip and a date",
    body: "Every departure shows its price and how many seats are actually left, updated as people book.",
  },
  {
    title: "Pay the advance",
    body: "A small advance per person holds your seat. Your seat is reserved for fifteen minutes while you pay.",
  },
  {
    title: "Your seat is confirmed",
    body: "You get a booking reference straight away, and we message you with everything you need before the day.",
  },
  {
    title: `We pick you up in ${BUSINESS_CITY}`,
    body: "Meet the group at the pickup point. At the end of the trip we drop you back at the same place.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-ink-100 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
            How it works
          </p>
          <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
            Four steps to your next trip
          </h2>
        </div>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-300 font-display text-lg font-semibold text-ink-900"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">
                {step.title}
              </h3>
              <p className="mt-2 text-text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-text-muted">
          Would rather talk it through first?{" "}
          <a
            href={BUSINESS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-magenta-600 no-underline hover:underline"
          >
            Message us on WhatsApp
          </a>
          .
        </p>
      </div>
    </section>
  );
}
