"use client";

import { SOFT_TAG_LIMIT } from "@/lib/soft-tags";
import type { Review } from "@/lib/review-types";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export function SoftTagsEditor({
  reviewId,
  tags,
  onChange,
}: {
  reviewId: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useTranslations("HistoryDetail");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | "full" | null>(null);

  async function save(next: string[]) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        review?: Review;
      };
      if (!response.ok) {
        setStatus(data.error === "too_many" || data.error === "too_long" ? "full" : "error");
        return;
      }
      onChange(data.review?.softTags ?? next);
      setDraft("");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  function addTag(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || busy) return;
    if (tags.length >= SOFT_TAG_LIMIT) {
      setStatus("full");
      return;
    }
    void save([...tags, next]);
  }

  return (
    <section className="mt-6 rounded-[1.5rem] bg-paper px-5 py-5 shadow-card" data-soft-tags="editor">
      <p className="font-display text-lg tracking-tight">{t("tagsTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("tagsLead")}</p>
      <p className="mt-2 text-xs text-muted">{t("tagsCount", { count: tags.length })}</p>
      {tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.toLocaleLowerCase()}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save(tags.filter((item) => item !== tag))}
                className="rounded-full bg-mint/80 px-3 py-1 text-sm disabled:opacity-60"
              >
                {tag}
                <span className="sr-only"> {t("tagsRemove", { tag })}</span>
                <span aria-hidden="true"> ×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={addTag} className="mt-4 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("tagsPlaceholder")}</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("tagsPlaceholder")}
            maxLength={16}
            disabled={busy || tags.length >= SOFT_TAG_LIMIT}
            className="w-full rounded-full border border-line bg-cream/70 px-4 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={busy || tags.length >= SOFT_TAG_LIMIT}
          className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {t("tagsAdd")}
        </button>
      </form>
      {busy ? <p className="mt-2 text-xs text-muted">{t("tagsSaving")}</p> : null}
      {status === "saved" ? <p className="mt-2 text-xs text-muted">{t("tagsSaved")}</p> : null}
      {status === "full" ? <p className="mt-2 text-xs text-muted">{t("tagsFull")}</p> : null}
      {status === "error" ? <p className="mt-2 text-xs text-muted">{t("tagsError")}</p> : null}
    </section>
  );
}
