"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteFaq, saveFaq } from "@/lib/admin-content-actions";

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-ink-300 bg-surface px-3 text-sm";

function FaqForm({
  faq,
  onSaved,
}: {
  faq: FaqRow | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = event.currentTarget;
    const result = await saveFaq(new FormData(form));

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!faq) form.reset();
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_5rem]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">
            Question
          </span>
          <input
            name="question"
            defaultValue={faq?.question ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Order</span>
          <input
            type="number"
            name="sortOrder"
            min={0}
            defaultValue={faq?.sortOrder ?? 0}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-text-muted">Answer</span>
        <textarea
          name="answer"
          rows={3}
          defaultValue={faq?.answer ?? ""}
          required
          className="rounded-lg border border-ink-300 bg-surface px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={faq?.isPublished ?? true}
            className="h-5 w-5 rounded border-ink-300"
          />
          Show on the website
        </label>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full bg-magenta-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-magenta-700 disabled:opacity-70"
        >
          {busy ? "Saving" : faq ? "Save" : "Add question"}
        </button>

        {faq ? <DeleteFaq id={faq.id} onDeleted={onSaved} /> : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-clay-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function DeleteFaq({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-text-muted underline hover:text-clay-700"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-clay-700">Delete this question?</span>
      <button
        type="button"
        onClick={async () => {
          await deleteFaq(id);
          onDeleted();
        }}
        className="font-semibold text-clay-700 underline"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-text-muted underline"
      >
        No
      </button>
    </span>
  );
}

export function AdminFaqEditor({ faqs }: { faqs: FaqRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div key={faq.id} className="rounded-2xl border border-border bg-surface">
          <FaqForm faq={faq} onSaved={refresh} />
        </div>
      ))}

      <div className="rounded-2xl border border-border bg-ink-50">
        <p className="px-4 pt-4 text-sm font-semibold text-text-strong">
          Add a question
        </p>
        <FaqForm faq={null} onSaved={refresh} />
      </div>
    </div>
  );
}
