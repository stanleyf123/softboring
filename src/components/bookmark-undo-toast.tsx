"use client";

import { BOOKMARK_UNDO_MS } from "@/lib/bookmark-undo";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingUndo = {
  noteId: string;
  fired: boolean;
  timer: number;
  commit: () => void;
  undo: () => void;
};

/**
 * Holds a lifted bookmark on this page for a few seconds.
 * The server change waits until the timer ends, the page leaves, or another lift replaces it.
 */
export function useBookmarkUndo() {
  const pendingRef = useRef<PendingUndo | null>(null);
  const [toast, setToast] = useState<{ label: string; key: number } | null>(null);

  const fire = useCallback((pending: PendingUndo) => {
    if (pending.fired) return;
    pending.fired = true;
    window.clearTimeout(pending.timer);
    if (pendingRef.current === pending) pendingRef.current = null;
    setToast(null);
    pending.commit();
  }, []);

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    fire(pending);
  }, [fire]);

  const undo = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending || pending.fired) return false;
    pending.fired = true;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setToast(null);
    pending.undo();
    return true;
  }, []);

  const matches = useCallback((noteId: string) => {
    const pending = pendingRef.current;
    return Boolean(pending && !pending.fired && pending.noteId === noteId);
  }, []);

  const begin = useCallback(
    (input: { noteId: string; label: string; onCommit: () => void; onUndo: () => void }) => {
      const previous = pendingRef.current;
      if (previous && previous.noteId !== input.noteId) fire(previous);
      else if (previous) return;

      const pending: PendingUndo = {
        noteId: input.noteId,
        fired: false,
        timer: 0,
        commit: input.onCommit,
        undo: input.onUndo,
      };
      pending.timer = window.setTimeout(() => fire(pending), BOOKMARK_UNDO_MS);
      pendingRef.current = pending;
      setToast({ label: input.label, key: Date.now() });
    },
    [fire],
  );

  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (!pending || pending.fired) return;
      pending.fired = true;
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      pending.commit();
    };
  }, []);

  return { toast, begin, undo, flush, matches, durationMs: BOOKMARK_UNDO_MS };
}

export function BookmarkUndoToast({
  open,
  label,
  durationMs,
  toastKey,
  onUndo,
}: {
  open: boolean;
  label: string;
  durationMs: number;
  toastKey: number;
  onUndo: () => void;
}) {
  const t = useTranslations("BookmarkUndo");
  if (!open) return null;

  return (
    <div
      className="soft-undo-toast"
      role="status"
      aria-live="polite"
      data-bookmark-undo="open"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm leading-relaxed">{t("lifted", { label })}</p>
          <p className="mt-1 text-xs text-muted">{t("hint")}</p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("undo")}
        </button>
      </div>
      <span
        key={toastKey}
        className="soft-undo-bar"
        style={{ animationDuration: `${durationMs}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}
