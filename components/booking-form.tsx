"use client";

import { useState } from "react";

import { formatRupees } from "@/lib/money";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { PAISE_PER_RUPEE, SEAT_HOLD_MINUTES } from "@/lib/constants";

type BookingFormProps = {
  departureId: string;
  tripTitle: string;
  availableSeats: number;
  pricePerPerson: number;
  advancePerPerson: number;
};

type Stage = "form" | "working" | "done";

export function BookingForm(props: BookingFormProps) {
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [travellerCount, setTravellerCount] = useState(1);
  const [travellerNames, setTravellerNames] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");

  const maxSeats = Math.min(props.availableSeats, 10);
  const advanceDue = props.advancePerPerson * travellerCount;
  const total = props.pricePerPerson * travellerCount;

  function updateTravellerName(index: number, value: string) {
    setTravellerNames((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStage("working");

    try {
      // The body carries no money at all. The server reads the price
      // from the departure row; see app/api/bookings/route.ts.
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          departureId: props.departureId,
          customerName,
          phone,
          email,
          travellerCount,
          travellerNames: travellerNames
            .slice(0, travellerCount)
            .filter((name) => name.trim().length > 0),
          specialRequests,
        }),
      });

      const created = await response.json();

      if (!response.ok) {
        setError(created.error ?? "Something went wrong. Please try again.");
        setStage("form");
        return;
      }

      const result = await openRazorpayCheckout({
        razorpayKeyId: created.razorpayKeyId,
        razorpayOrderId: created.razorpayOrderId,
        amountInPaise: created.amountDueRupees * PAISE_PER_RUPEE,
        tripTitle: props.tripTitle,
        bookingRef: created.bookingRef,
        customerName,
        phone,
        email: email || undefined,
      });

      if (!result) {
        setError(
          `You closed the payment window. Your seats are held for ${SEAT_HOLD_MINUTES} minutes, so you can try again.`,
        );
        setStage("form");
        return;
      }

      // Tells the customer honestly whether the payment went through.
      // The booking is only actually confirmed by the webhook.
      await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });

      setBookingRef(created.bookingRef);
      setStage("done");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
      setStage("form");
    }
  }

  if (stage === "done" && bookingRef) {
    return (
      <div className="rounded-2xl border border-leaf-300 bg-leaf-50 p-6">
        <h2 className="text-2xl text-leaf-700">Payment received</h2>
        <p className="mt-3 text-text">
          Your booking reference is{" "}
          <strong className="font-display text-xl">{bookingRef}</strong>. Keep
          it somewhere safe, and quote it if you message us.
        </p>
        <p className="mt-3 text-text-muted">
          We will send you the trip details on WhatsApp shortly. If you do not
          hear from us within a day, message us with that reference.
        </p>
      </div>
    );
  }

  const busy = stage === "working";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-clay-500 bg-clay-50 px-4 py-3 text-sm text-clay-700"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-strong">Your name</span>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-strong">
            Mobile number
          </span>
          <input
            required
            inputMode="numeric"
            placeholder="10 digit number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-strong">
            Email <span className="font-normal text-text-muted">(optional)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-strong">
            How many of you
          </span>
          <select
            value={travellerCount}
            onChange={(e) => setTravellerCount(Number(e.target.value))}
            className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
          >
            {Array.from({ length: maxSeats }, (_, index) => index + 1).map(
              (count) => (
                <option key={count} value={count}>
                  {count === 1 ? "Just me" : `${count} travellers`}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      {travellerCount > 1 ? (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-semibold text-text-strong">
            Who is travelling with you
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: travellerCount - 1 }, (_, index) => (
              <input
                key={index}
                placeholder={`Traveller ${index + 2}`}
                value={travellerNames[index] ?? ""}
                onChange={(e) => updateTravellerName(index, e.target.value)}
                className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-text-strong">
          Anything we should know{" "}
          <span className="font-normal text-text-muted">(optional)</span>
        </span>
        <textarea
          rows={3}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          className="rounded-xl border border-ink-300 bg-surface px-4 py-3"
        />
      </label>

      <div className="rounded-xl bg-ink-100 p-5">
        <p className="flex items-baseline justify-between">
          <span className="text-text-muted">Trip total</span>
          <span className="font-display text-lg font-semibold">
            {formatRupees(total)}
          </span>
        </p>
        <p className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
          <span className="font-semibold text-text-strong">Pay now to hold</span>
          <span className="font-display text-2xl font-semibold text-magenta-700">
            {formatRupees(advanceDue)}
          </span>
        </p>
        <p className="mt-2 text-xs text-text-muted">
          The rest is payable to us before the trip. Your seats are held for{" "}
          {SEAT_HOLD_MINUTES} minutes while you pay.
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-magenta-600 px-7 font-semibold text-white shadow-brand transition-colors hover:bg-magenta-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Opening payment..." : `Pay ${formatRupees(advanceDue)} and hold my seat`}
      </button>
    </form>
  );
}
