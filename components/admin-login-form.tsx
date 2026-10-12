"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? "We could not sign you in.");
        setBusy(false);
        return;
      }

      // refresh() rather than push(): the session cookie has just
      // changed, and the server needs to re-render the admin layout with
      // the new session rather than serve a cached version.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
      setBusy(false);
    }
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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-text-strong">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-text-strong">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 rounded-xl border border-ink-300 bg-surface px-4"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-magenta-600 px-7 font-semibold text-white transition-colors hover:bg-magenta-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
