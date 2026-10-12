import { formatRupees } from "@/lib/money";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import type { AdminBooking } from "@/lib/admin-bookings";

// Colour carries meaning here, so it is paired with the word itself
// rather than used alone: a status nobody can read is not a status.
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gold-100 text-gold-700",
  confirmed: "bg-leaf-100 text-leaf-700",
  cancelled: "bg-ink-200 text-ink-700",
  expired: "bg-ink-200 text-ink-700",
  refunded: "bg-clay-100 text-clay-700",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function AdminBookingRow({ booking }: { booking: AdminBooking }) {
  const balance = booking.totalAmount - booking.amountPaid;
  const payment = booking.payments[0];

  return (
    <details className="group border-b border-border last:border-0">
      <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-x-4 gap-y-1 px-4 py-4 marker:hidden hover:bg-ink-50 sm:grid-cols-[9rem_1fr_9rem_7rem_6rem]">
        <span className="font-mono text-sm font-semibold text-ink-900">
          {booking.bookingRef}
        </span>

        <span className="col-span-2 sm:col-span-1">
          <span className="block font-semibold text-ink-900">
            {booking.customerName}
          </span>
          <span className="block text-sm text-text-muted">
            {booking.departure.trip.title}
          </span>
        </span>

        <span className="text-sm text-text-muted">
          {formatDate(booking.departure.startDate)}
        </span>

        <span className="text-sm">
          <span className="block font-semibold text-ink-900">
            {formatRupees(booking.amountPaid)}
          </span>
          {balance > 0 ? (
            <span className="block text-xs text-text-muted">
              {formatRupees(balance)} due
            </span>
          ) : null}
        </span>

        <span
          className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[booking.status] ?? "bg-ink-200 text-ink-700"
          }`}
        >
          {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </summary>

      <div className="grid gap-5 bg-ink-50 px-4 py-5 text-sm sm:grid-cols-3">
        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Contact
          </h3>
          <p className="mt-2">
            <a
              href={`tel:${booking.phone}`}
              className="font-semibold text-magenta-700 no-underline hover:underline"
            >
              {booking.phone}
            </a>
          </p>
          {booking.email ? (
            <p className="text-text-muted">{booking.email}</p>
          ) : null}
          <p className="mt-2 text-text-muted">
            Booked {formatDate(booking.createdAt)}
          </p>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Travellers ({booking.travellerCount})
          </h3>
          {booking.travellerNames.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {booking.travellerNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-text-muted">No names given</p>
          )}
          {booking.specialRequests ? (
            <p className="mt-2 text-text-muted">
              Note: {booking.specialRequests}
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Payment
          </h3>
          <p className="mt-2">
            {formatRupees(booking.amountPaid)} of{" "}
            {formatRupees(booking.totalAmount)}
          </p>
          {payment?.razorpayPaymentId ? (
            <p className="mt-1 break-all font-mono text-xs text-text-muted">
              {payment.razorpayPaymentId}
            </p>
          ) : null}
          {payment?.razorpayRefundId ? (
            <p className="mt-1 break-all font-mono text-xs text-clay-700">
              refund {payment.razorpayRefundId}
            </p>
          ) : null}
          {booking.adminNotes ? (
            <p className="mt-2 text-text-muted">{booking.adminNotes}</p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
