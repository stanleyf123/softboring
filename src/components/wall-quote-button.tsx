"use client";

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
  const [error, setError] = useState<"generic" | "rate" | null>(null);

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
    setError(null);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(noteId)}/quote`, {
        cache: "no-store",
      });
      if (response.status === 429) {
        setError("rate");
        return;
      }
      if (!response.ok) {
        setError("generic");
        return;
      }
      const data = (await response.json()) as { quote?: Partial<WallQuotePayload> };
      const quote = data.quote;
      if (!quote?.noteId) {
        setError("generic");
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
      setError("generic");
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
        <span className={compact ? "sr-only" : "mt-2 text-sm text-muted"} role="alert">
          {error === "rate" ? t("quoteRate") : t("quoteError")}
        </span>
      ) : null}
    </span>
  );
}
