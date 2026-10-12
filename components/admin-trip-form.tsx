"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveTrip } from "@/lib/admin-trip-actions";
import { TRIP_TYPE_LABELS } from "@/lib/constants";

type Category = { slug: string; name: string };

export type TripFormValues = {
  id?: string;
  slug: string;
  title: string;
  destination: string;
  description: string;
  durationDays: number;
  tripType: string;
  minAge: number | null;
  departurePoint: string;
  departureTime: string;
  returnPoint: string;
  returnTime: string;
  knowBeforeYouGo: string | null;
  isActive: boolean;
  inclusions: string[];
  exclusions: string[];
  images: string[];
  categorySlugs: string[];
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-text-strong">{label}</span>
      {children}
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-12 rounded-xl border border-ink-300 bg-surface px-4 text-text";
const areaClass = "rounded-xl border border-ink-300 bg-surface px-4 py-3";

export function AdminTripForm({
  trip,
  categories,
}: {
  trip: TripFormValues;
  categories: Category[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result = await saveTrip(new FormData(event.currentTarget));

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push("/admin/trips");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-clay-500 bg-clay-50 px-4 py-3 text-sm text-clay-700"
        >
          {error}
        </p>
      ) : null}

      {trip.id ? <input type="hidden" name="id" value={trip.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Trip name">
          <input name="title" defaultValue={trip.title} required className={inputClass} />
        </Field>

        <Field
          label="Web address"
          hint="Lowercase letters, numbers and hyphens. Changing this breaks any link already shared."
        >
          <input name="slug" defaultValue={trip.slug} required className={inputClass} />
        </Field>

        <Field label="Where it goes">
          <input
            name="destination"
            defaultValue={trip.destination}
            required
            className={inputClass}
          />
        </Field>

        <Field label="How many days">
          <input
            type="number"
            name="durationDays"
            min={1}
            defaultValue={trip.durationDays}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Who it is for">
          <select name="tripType" defaultValue={trip.tripType} className={inputClass}>
            {Object.entries(TRIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Minimum age" hint="Leave empty if there is none.">
          <input
            type="number"
            name="minAge"
            min={0}
            defaultValue={trip.minAge ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Pickup point">
          <input
            name="departurePoint"
            defaultValue={trip.departurePoint}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Pickup time" hint='For example "9:00 PM, Friday".'>
          <input
            name="departureTime"
            defaultValue={trip.departureTime}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Drop point">
          <input
            name="returnPoint"
            defaultValue={trip.returnPoint}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Drop time">
          <input
            name="returnTime"
            defaultValue={trip.returnTime}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Description" hint="Shown at the top of the trip page.">
        <textarea
          name="description"
          rows={4}
          defaultValue={trip.description}
          required
          className={areaClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What is included" hint="One per line.">
          <textarea
            name="inclusions"
            rows={6}
            defaultValue={trip.inclusions.join("\n")}
            className={areaClass}
          />
        </Field>

        <Field label="What is not included" hint="One per line.">
          <textarea
            name="exclusions"
            rows={6}
            defaultValue={trip.exclusions.join("\n")}
            className={areaClass}
          />
        </Field>
      </div>

      <Field
        label="Photos"
        hint="One path per line, for example /images/munnar.jpg. Upload files below first."
      >
        <textarea
          name="images"
          rows={3}
          defaultValue={trip.images.join("\n")}
          className={areaClass}
        />
      </Field>

      <Field label="Know before you go" hint="Shown in a highlighted box.">
        <textarea
          name="knowBeforeYouGo"
          rows={3}
          defaultValue={trip.knowBeforeYouGo ?? ""}
          className={areaClass}
        />
      </Field>

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-text-strong">
          Categories
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {categories.map((category) => (
            <label key={category.slug} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="categories"
                value={category.slug}
                defaultChecked={trip.categorySlugs.includes(category.slug)}
                className="h-5 w-5 rounded border-ink-300"
              />
              <span className="text-sm">{category.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-3 rounded-xl border border-border p-4">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={trip.isActive}
          className="h-5 w-5 rounded border-ink-300"
        />
        <span>
          <span className="block font-semibold text-text-strong">
            Show this trip on the website
          </span>
          <span className="block text-xs text-text-muted">
            Unticking hides it everywhere without deleting anything.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-13 items-center rounded-full bg-magenta-600 px-7 font-semibold text-white transition-colors hover:bg-magenta-700 disabled:opacity-70"
      >
        {busy ? "Saving..." : "Save trip"}
      </button>
    </form>
  );
}
