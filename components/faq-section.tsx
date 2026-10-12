import { BUSINESS_WHATSAPP_URL } from "@/lib/constants";

type Faq = { id: string; question: string; answer: string };

// Built on <details> and <summary>, which are a browser-native
// accordion: keyboard support, screen reader support and open/close
// state all come free. The alternative is a client component with
// useState and aria wiring, for no gain a visitor could see.
export function FaqSection({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className="bg-ink-100 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-magenta-600">
          Good to know
        </p>
        <h2 className="mt-5 text-4xl leading-[1.08] sm:text-5xl">
          Questions, answered
        </h2>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.id} className="group py-2">
              {/* min-h-14 makes the whole row a 56px target. Without it
                  the summary is only as tall as its text, about 32px,
                  and an accordion is a control you tap, not a sentence
                  you read, so the inline-link exemption does not apply. */}
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold text-ink-900 marker:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-magenta-600 transition-transform duration-300 group-open:rotate-45"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4">
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-2xl pr-14 text-text-muted">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-center text-text-muted">
          Still wondering about something?{" "}
          <a
            href={BUSINESS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-magenta-600 no-underline hover:underline"
          >
            Ask us on WhatsApp
          </a>
          .
        </p>
      </div>
    </section>
  );
}
