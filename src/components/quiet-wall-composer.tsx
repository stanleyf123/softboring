"use client";

import {
  clearQuietDraft,
  loadQuietDraft,
  quietDraftKey,
  saveQuietDraft,
} from "@/lib/quiet-drafts";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function QuietWallComposer({
  noteId,
  replyToId,
  busy,
  onCancelReply,
  onSubmit,
}: {
  noteId: string;
  replyToId: string | null;
  busy: boolean;
  onCancelReply: () => void;
  onSubmit: (body: string) => Promise<boolean>;
}) {
  const t = useTranslations("Wall");
  const draftKey = quietDraftKey(noteId, replyToId);
  const [body, setBody] = useState("");
  const [offer, setOffer] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadQuietDraft(draftKey).trim();
    setOffer(saved || null);
    setBody("");
  }, [draftKey]);

  function onChange(value: string) {
    setBody(value);
    setOffer(null);
    if (value.trim()) saveQuietDraft(draftKey, value);
    else clearQuietDraft(draftKey);
  }

  function restore() {
    if (!offer) return;
    setBody(offer);
    setOffer(null);
  }

  function dismiss() {
    clearQuietDraft(draftKey);
    setOffer(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = body.trim();
    if (!next || busy) return;
    const ok = await onSubmit(next);
    if (!ok) return;
    clearQuietDraft(draftKey);
    setBody("");
    setOffer(null);
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
      {replyToId ? (
        <p className="text-xs text-muted">
          {t("replying")}{" "}
          <button type="button" onClick={onCancelReply} className="text-accent">
            {t("cancelReply")}
          </button>
        </p>
      ) : null}
      {offer ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-[1.25rem] bg-blush/70 px-3 py-2 text-sm"
          role="status"
        >
          <p className="min-w-0 flex-1 leading-relaxed">{t("draftBanner")}</p>
          <button
            type="button"
            onClick={restore}
            className="inline-flex min-h-11 items-center rounded-full bg-paper px-3 py-1.5 text-sm shadow-card"
          >
            {t("draftRestore")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm text-muted"
          >
            {t("draftDismiss")}
          </button>
        </div>
      ) : null}
      <textarea
        value={body}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder={replyToId ? t("replyPlaceholder") : t("commentPlaceholder")}
        className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
      />
      <p className="text-xs text-muted">{t("draftHint")}</p>
      <button
        type="submit"
        disabled={busy || !body.trim()}
        className="inline-flex min-h-11 items-center self-start rounded-full bg-accent px-4 py-2 text-sm text-paper disabled:opacity-60"
      >
        {replyToId ? t("replySubmit") : t("commentSubmit")}
      </button>
    </form>
  );
}
