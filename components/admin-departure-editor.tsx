"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteDeparture,
  saveDeparture,
} from "@/lib/admin-departure-actions";
import { formatRupees } from "@/lib/money";

export type DepartureRow = {
  id: string;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  advanceAmount: number;
  totalSeats: number;
  seatsConfirmed: number;
  status: string;
  bookingCount: number;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-ink-300 bg-surface px-3 text-sm";

const STATUSES = [
  { value: "open", label: "Open for booking" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

// One row per date. Each is its own small form so saving one does not
// touch the others, and so a validation error names the date it belongs
// to rather than a whole page of them.
function DepartureForm({
  tripId,
  departure,
  onSaved,
}: {
  tripId: string;
  departure: DepartureRow | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = event.currentTarget;
    const result = await saveDeparture(new FormData(form));

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!departure) {
      form.reset();
    }
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-border p-4 last:border-0"
    >
      <input type="hidden" name="tripId" value={tripId} />
      {departure ? <input type="hidden" name="id" value={departure.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Starts</span>
          <input
            type="date"
            name="startDate"
            defaultValue={departure?.startDate ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Returns</span>
          <input
            type="date"
            name="endDate"
            defaultValue={departure?.endDate ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">
            Price each
          </span>
          <input
            type="number"
            name="pricePerPerson"
            min={0}
            defaultValue={departure?.pricePerPerson ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">
            Advance each
          </span>
          <input
            type="number"
            name="advanceAmount"
            min={0}
            defaultValue={departure?.advanceAmount ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Seats</span>
          <input
            type="number"
            name="totalSeats"
            min={1}
            defaultValue={departure?.totalSeats ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Status</span>
          <select
            name="status"
            defaultValue={departure?.status ?? "open"}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-full bg-magenta-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-magenta-700 disabled:opacity-70"
          >
            {busy ? "Saving" : departure ? "Save" : "Add"}
          </button>
        </div>
      </div>

      {departure ? (
        <p className="mt-2 text-xs text-text-muted">
          {departure.seatsConfirmed} of {departure.totalSeats} seats confirmed,{" "}
          {departure.bookingCount} booking
          {departure.bookingCount === 1 ? "" : "s"}. Advance{" "}
          {formatRupees(departure.advanceAmount)}. Confirmed seats are counted
          from payments and cannot be edited here.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function DeleteDepartureButton({
  departure,
  onDeleted,
}: {
  departure: DepartureRow;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    const result = await deleteDeparture(departure.id);
    if (!result.ok) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    onDeleted();
  }

  if (departure.bookingCount > 0) {
    return (
      <p className="px-4 pb-3 text-xs text-text-muted">
        This date cannot be deleted because it has bookings. Set it to
        cancelled instead.
      </p>
    );
  }

  return (
    <div className="px-4 pb-3">
      {confirming ? (
        <span className="flex items-center gap-3 text-sm">
          <span className="text-clay-700">Delete this date?</span>
          <button
            type="button"
            onClick={handleDelete}
            className="font-semibold text-clay-700 underline"
          >
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-text-muted underline"
          >
            Keep it
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-semibold text-text-muted underline hover:text-clay-700"
        >
          Delete this date
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminDepartureEditor({
  tripId,
  departures,
}: {
  tripId: string;
  departures: DepartureRow[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {departures.map((departure) => (
        <div key={departure.id}>
          <DepartureForm
            tripId={tripId}
            departure={departure}
            onSaved={refresh}
          />
          <DeleteDepartureButton departure={departure} onDeleted={refresh} />
        </div>
      ))}

      <div className="bg-ink-50">
        <p className="px-4 pt-4 text-sm font-semibold text-text-strong">
          Add another date
        </p>
        <DepartureForm tripId={tripId} departure={null} onSaved={refresh} />
      </div>
    </div>
  );
}
