"use client";

import { noticeWallRateLimit } from "@/lib/wall-rate-notice";
import {
  quoteCardFilename,
  renderWallQuotePng,
  wallQuoteColor,
  type WallQuoteLabels,
  type WallQuotePayload,
} from "@/lib/wall-quote";
import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WallQuoteButton({
  noteId,
  compact = false,
}: {
  noteId: string;
  compact?: boolean;
}) {
  const t = useTranslations("Wall");
  const tCard = useTranslations("QuoteCard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const labels: WallQuoteLabels = {
    brand: tCard("brand"),
    kind: tCard("kind"),
    footer: tCard("footer"),
    anonymous: tCard("anonymous"),
    emptyQuote: tCard("emptyQuote"),
  };

  async function onQuote(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(noteId)}/quote`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        quote?: Partial<WallQuotePayload>;
      };
      if (noticeWallRateLimit(response.status, data.error)) return;
      if (!response.ok) {
        setError(true);
        return;
      }
      const quote = data.quote;
      if (!quote?.noteId) {
        setError(true);
        return;
      }
      const payload: WallQuotePayload = {
        noteId: quote.noteId,
        quote: typeof quote.quote === "string" ? quote.quote : "",
        author: typeof quote.author === "string" ? quote.author : null,
        color: wallQuoteColor(quote.color),
      };
      const blob = await renderWallQuotePng(payload, labels);
      downloadBlob(blob, quoteCardFilename(payload.noteId));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start" data-wall-quote={noteId}>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => void onQuote(event)}
        disabled={busy}
        aria-label={t("quoteAria")}
        className={
          compact
            ? "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper/95 text-sm text-accent shadow-card disabled:opacity-60"
            : "inline-flex min-h-11 items-center rounded-full bg-cream px-4 py-2 text-sm shadow-card disabled:opacity-60"
        }
      >
        {compact ? "“" : busy ? t("quoteBusy") : t("quoteCta")}
      </button>
      {error ? (
        <span className={compact ? "sr-only" : "mt-2 text-sm text-muted"} role="status">
          {t("quoteError")}
        </span>
      ) : null}
    </span>
  );
}
