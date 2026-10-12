import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Waitlist" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default async function AdminWaitlistPage() {
  await requireAdmin();

  const entries = await prisma.waitlistEntry.findMany({
    // Oldest first: whoever asked first should be called first.
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      seatsWanted: true,
      notified: true,
      createdAt: true,
      departure: {
        select: {
          startDate: true,
          totalSeats: true,
          seatsConfirmed: true,
          trip: { select: { title: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Waitlist</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Women who asked for a seat on a date that was full, oldest request
        first. Call them in this order when a seat opens or when you add
        another date for the same trip.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface px-5 py-12 text-center text-text-muted">
          Nobody is waiting at the moment.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_10rem_9rem_7rem]"
            >
              <span className="col-span-2 sm:col-span-1">
                <span className="block font-semibold text-ink-900">
                  {entry.name}
                </span>
                <span className="block text-sm text-text-muted">
                  {entry.departure.trip.title}
                </span>
              </span>

              <a
                href={`tel:${entry.phone}`}
                className="self-center font-semibold text-magenta-700 no-underline hover:underline"
              >
                {entry.phone}
              </a>

              <span className="self-center text-sm text-text-muted">
                {formatDate(entry.departure.startDate)}
              </span>

              <span className="self-center text-sm">
                <span className="text-text-muted">
                  {entry.seatsWanted} seat
                  {entry.seatsWanted === 1 ? "" : "s"}
                </span>
                {entry.notified ? (
                  <span className="mt-1 block text-xs font-semibold text-leaf-700">
                    Called
                  </span>
                ) : (
                  <span className="mt-1 block text-xs font-semibold text-clay-600">
                    Not called yet
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
