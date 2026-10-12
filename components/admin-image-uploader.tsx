"use client";

import { useState } from "react";

// Uploads a photo and shows the path to paste into the trip's Photos
// box. Deliberately does not write to the trip itself: the admin is
// usually uploading several and arranging them afterwards, and a
// surprise save while she is halfway through editing other fields
// would lose that work.
export function AdminImageUploader() {
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/admin/images", {
        method: "POST",
        body,
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "We could not upload that photo.");
      } else {
        setUploadedPaths((previous) => [result.path, ...previous]);
      }
    } catch {
      setError("We could not reach the server.");
    } finally {
      setBusy(false);
      // Clearing the input means picking the same file again still
      // fires a change event.
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-strong">
          Choose a photo
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={busy}
          className="text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-magenta-600 file:px-5 file:text-sm file:font-semibold file:text-white"
        />
        <span className="text-xs text-text-muted">
          JPEG, PNG or WebP, up to 6MB. Landscape photos look best.
        </span>
      </label>

      {busy ? (
        <p className="mt-3 text-sm text-text-muted">Uploading...</p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-clay-500 bg-clay-50 px-4 py-3 text-sm text-clay-700"
        >
          {error}
        </p>
      ) : null}

      {uploadedPaths.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-text-strong">
            Uploaded. Copy a path into the Photos box below.
          </p>
          <ul className="mt-2 space-y-1">
            {uploadedPaths.map((path) => (
              <li key={path}>
                <code className="block break-all rounded-lg bg-ink-100 px-3 py-2 text-xs">
                  {path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
