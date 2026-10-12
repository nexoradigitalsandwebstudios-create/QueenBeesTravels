"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveSiteSettings } from "@/lib/admin-content-actions";

export type SettingRow = { key: string; value: string; label: string };

const inputClass =
  "min-h-12 w-full rounded-xl border border-ink-300 bg-surface px-4";

export function AdminSettingsForm({ settings }: { settings: SettingRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);

    const result = await saveSiteSettings(new FormData(event.currentTarget));

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

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

      {saved ? (
        <p className="rounded-xl border border-leaf-300 bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
          Saved. The website is updated.
        </p>
      ) : null}

      {settings.map((setting) => {
        // The Instagram strip is a list of paths, which needs room.
        const isList = setting.key === "instagram_images";

        return (
          <label key={setting.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-strong">
              {setting.label}
            </span>
            {isList ? (
              <textarea
                name={setting.key}
                rows={3}
                defaultValue={setting.value}
                className="rounded-xl border border-ink-300 bg-surface px-4 py-3 text-sm"
              />
            ) : (
              <input
                name={setting.key}
                defaultValue={setting.value}
                className={inputClass}
              />
            )}
            <span className="text-xs text-text-muted">
              Leaving this empty hides it from the website entirely.
            </span>
          </label>
        );
      })}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-13 items-center rounded-full bg-magenta-600 px-7 font-semibold text-white transition-colors hover:bg-magenta-700 disabled:opacity-70"
      >
        {busy ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
