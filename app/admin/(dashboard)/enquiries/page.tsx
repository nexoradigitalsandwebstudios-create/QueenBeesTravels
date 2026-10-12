import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiries" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default async function AdminEnquiriesPage() {
  await requireAdmin();

  const enquiries = await prisma.enquiry.findMany({
    // Unhandled first, then newest, so nothing waits unanswered while
    // newer messages get attention.
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      message: true,
      source: true,
      handled: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Enquiries</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Messages sent through the website, with anything still unanswered at
        the top.
      </p>

      {enquiries.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface px-5 py-12 text-center text-text-muted">
          No enquiries yet. The contact form sends them here.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {enquiries.map((enquiry) => (
            <li
              key={enquiry.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span>
                  <span className="font-semibold text-ink-900">
                    {enquiry.name}
                  </span>
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="ml-3 font-semibold text-magenta-700 no-underline hover:underline"
                  >
                    {enquiry.phone}
                  </a>
                  {enquiry.email ? (
                    <span className="ml-3 text-sm text-text-muted">
                      {enquiry.email}
                    </span>
                  ) : null}
                </span>

                <span className="flex items-center gap-3 text-xs text-text-muted">
                  {formatDate(enquiry.createdAt)}
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      enquiry.handled
                        ? "bg-leaf-100 text-leaf-700"
                        : "bg-gold-100 text-gold-700"
                    }`}
                  >
                    {enquiry.handled ? "Answered" : "Waiting"}
                  </span>
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-text">
                {enquiry.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
