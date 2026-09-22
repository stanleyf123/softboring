"use client";

import { EmptyState, WallSkeleton } from "@/components/empty-state";
import { shareErrorCopy } from "@/components/share-to-wall";
import { WallActivityStrip } from "@/components/wall-activity-strip";
import { WallSpotlightStrip } from "@/components/wall-spotlight-strip";
import { Link, useRouter } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import {
  EMPTY_WALL_FILTERS,
  filterWallNotes,
  normalizeFeelingBound,
  readHideDemoPreference,
  wallFiltersActive,
  writeHideDemoPreference,
  type WallDiscoveryFilters,
} from "@/lib/wall-filters";
import { parseWallShareError, type WallShareErrorKey } from "@/lib/wall-share";
import { WALL_CANVAS } from "@/lib/wall-canvas";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TeaserNote = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  praiseCount: number;
  ownerNickname?: string | null;
};

type FullNote = TeaserNote & {
  mine: boolean;
  excerpt: string;
  feeling: number | null;
  summary: string;
  createdAt: string;
  pinned?: boolean;
  bookmarked?: boolean;
  flaggedByMe?: boolean;
  ownerSoftPlus?: boolean;
  ownerFallback?: string | null;
  ownerInviteBadge?: boolean;
  ownerIsDemo?: boolean;
  stickers: Array<{ stickerId: string; slug: string; emoji: string; count: number }>;
  energy?: string;
  drain?: string;
  lessOf?: string;
  priorities?: string;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  parentId?: string | null;
};

type Sticker = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  formatted: string;
  emoji: string;
};

const COLOR_CLASS: Record<string, string> = {
  peach: "bg-peach",
  blush: "bg-blush",
  mint: "bg-mint",
  cream: "bg-cream",
  lemon: "bg-lemon",
  sky: "bg-sky",
};

function noteClass(color: string) {
  return COLOR_CLASS[color] ?? "bg-peach";
}

function wallAuthorLabel(
  note: { ownerNickname?: string | null; ownerFallback?: string | null },
  visitorLabel: string,
  allowEmailFallback: boolean,
) {
  const nick = note.ownerNickname?.trim();
  if (nick) return nick;
  if (allowEmailFallback) {
    const fallback = note.ownerFallback?.trim();
    if (fallback) return fallback;
  }
  return visitorLabel;
}

function tiltFor(id: string) {
  let n = 0;
  for (const char of id) n += char.charCodeAt(0);
  return (n % 7) - 3;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(data.error || "request_failed");
    error.name = data.error || "request_failed";
    throw error;
  }
  return data;
}

export function WallBoard({
  signedIn,
  softPlus,
  stickerSuccess = false,
  sharedSuccess = false,
  initialNoteId = null,
}: {
  signedIn: boolean;
  softPlus: boolean;
  stickerSuccess?: boolean;
  sharedSuccess?: boolean;
  initialNoteId?: string | null;
}) {
  const t = useTranslations("Wall");
  const tStickers = useTranslations("WallStickers");
  const tQuestions = useTranslations("Questions");
  const locale = useLocale();
  const router = useRouter();
  const [notes, setNotes] = useState<Array<TeaserNote | FullNote>>([]);
  const [latestOwnedReviewId, setLatestOwnedReviewId] = useState<string | null>(null);
  const [locked, setLocked] = useState(!softPlus);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [sharedToast, setSharedToast] = useState(sharedSuccess);
  const [shareLatestError, setShareLatestError] = useState<WallShareErrorKey | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FullNote | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [inventoryCount, setInventoryCount] = useState(0);
  const [placedThisMonth, setPlacedThisMonth] = useState(0);
  const [packLabel, setPackLabel] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [shopError, setShopError] = useState<"not_configured" | "generic" | null>(null);
  const [filters, setFilters] = useState<WallDiscoveryFilters>(() => ({
    ...EMPTY_WALL_FILTERS,
    hideDemo: false,
  }));
  const drag = useRef<{
    id: string;
    dx: number;
    dy: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
    threshold: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const openedInitialNote = useRef(false);
  const noteCloseRef = useRef<HTMLButtonElement>(null);
  const shopCloseRef = useRef<HTMLButtonElement>(null);
  const detailReturnFocusRef = useRef<HTMLElement | null>(null);

  const visibleNotes = useMemo(() => {
    if (!softPlus || locked) return notes;
    return filterWallNotes(notes as FullNote[], filters);
  }, [notes, filters, softPlus, locked]);

  const filtersOn = softPlus && !locked && wallFiltersActive(filters);

  useEffect(() => {
    if (!softPlus || locked) return;
    const hideDemo = readHideDemoPreference();
    if (!hideDemo) return;
    setFilters((current) =>
      current.hideDemo === hideDemo ? current : { ...current, hideDemo },
    );
  }, [softPlus, locked]);

  function canvasPoint(event: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: event.clientX, y: event.clientY };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function setScrollerLock(lockedScroll: boolean) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.style.touchAction = lockedScroll ? "none" : "";
    scroller.style.overflow = lockedScroll ? "hidden" : "auto";
  }

  const loadNotes = useCallback(async () => {
    const data = await readJson<{
      locked: boolean;
      notes: Array<TeaserNote | FullNote>;
      latestOwnedReviewId?: string | null;
    }>(await fetch("/api/wall/notes", { cache: "no-store" }));
    setLocked(data.locked);
    setNotes(data.notes);
    setLatestOwnedReviewId(data.latestOwnedReviewId ?? null);
  }, []);

  const loadShop = useCallback(async () => {
    const data = await readJson<{
      stickers: Sticker[];
      inventory: Record<string, number>;
      inventoryCount?: number;
      placedThisMonth?: number;
      pack: { formatted: string };
      stripeConfigured: boolean;
    }>(await fetch("/api/wall/stickers", { cache: "no-store" }));
    setStickers(data.stickers);
    setInventory(data.inventory);
    const count =
      typeof data.inventoryCount === "number"
        ? data.inventoryCount
        : Object.values(data.inventory).reduce((sum, qty) => sum + Math.max(0, qty), 0);
    setInventoryCount(count);
    setPlacedThisMonth(
      typeof data.placedThisMonth === "number" ? data.placedThisMonth : 0,
    );
    setPackLabel(data.pack.formatted);
    setStripeConfigured(data.stripeConfigured);
  }, []);

  function closeNoteDetail() {
    setSelectedId(null);
    setDetail(null);
    setReplyToId(null);
    const returnTo = detailReturnFocusRef.current;
    detailReturnFocusRef.current = null;
    if (returnTo) {
      window.requestAnimationFrame(() => returnTo.focus());
    }
  }

  function closeShop() {
    setShopOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadNotes();
        if (softPlus) await loadShop();
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadNotes, loadShop, softPlus]);

  useEffect(() => {
    if (openedInitialNote.current) return;
    if (!ready || !softPlus || locked || !initialNoteId) return;
    if (!notes.some((note) => note.id === initialNoteId)) return;
    openedInitialNote.current = true;
    void openNote(initialNoteId);
    // openNote is stable enough for a one-shot deep link after first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, softPlus, locked, initialNoteId, notes]);

  useEffect(() => {
    if (!selectedId && !shopOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (selectedId) {
        closeNoteDetail();
        return;
      }
      if (shopOpen) closeShop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, shopOpen]);

  useEffect(() => {
    if (selectedId && detail) {
      noteCloseRef.current?.focus();
      return;
    }
    if (shopOpen) {
      shopCloseRef.current?.focus();
    }
  }, [selectedId, detail, shopOpen]);

  async function openNote(id: string) {
    if (locked) return;
    detailReturnFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    setSelectedId(id);
    try {
      const [noteData, commentData] = await Promise.all([
        readJson<{ note: FullNote }>(
          await fetch(`/api/wall/notes/${encodeURIComponent(id)}`, { cache: "no-store" }),
        ),
        readJson<{ comments: Comment[] }>(
          await fetch(`/api/wall/notes/${encodeURIComponent(id)}/comments`, {
            cache: "no-store",
          }),
        ),
      ]);
      setDetail(noteData.note);
      setComments(commentData.comments);
      setReplyToId(null);
      setCommentBody("");
    } catch {
      setSelectedId(null);
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, note: TeaserNote) {
    if (locked || !softPlus) return;
    if (event.pointerType === "touch") event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    drag.current = {
      id: note.id,
      dx: point.x - note.x,
      dy: point.y - note.y,
      startX: point.x,
      startY: point.y,
      x: note.x,
      y: note.y,
      moved: false,
      threshold: event.pointerType === "touch" ? 14 : 6,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.currentTarget.dataset.noteId) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const x = point.x - current.dx;
    const y = point.y - current.dy;
    if (
      Math.abs(point.x - current.startX) > current.threshold ||
      Math.abs(point.y - current.startY) > current.threshold
    ) {
      if (!current.moved) setScrollerLock(true);
      current.moved = true;
    }
    current.x = x;
    current.y = y;
    setNotes((list) =>
      list.map((note) =>
        note.id === current.id
          ? { ...note, x, y, z: "pinned" in note && note.pinned ? 100_000 : 10_000 }
          : note,
      ),
    );
  }

  async function onPointerUp(event: React.PointerEvent<HTMLButtonElement>, note: TeaserNote) {
    const current = drag.current;
    drag.current = null;
    setScrollerLock(false);
    if (!current || current.id !== note.id) return;
    if (!current.moved) {
      void openNote(note.id);
      return;
    }
    const x = current.x;
    const y = current.y;
    try {
      const data = await readJson<{ note: FullNote }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(note.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x, y }),
        }),
      );
      if (data.note) {
        setNotes((list) =>
          list.map((item) => (item.id === data.note.id ? { ...item, ...data.note } : item)),
        );
      }
    } catch {
      void loadNotes();
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already have been released.
    }
  }

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || busy) return;
    const body = commentBody.trim();
    if (!body) return;
    setBusy("comment");
    try {
      const data = await readJson<{ comment: Comment }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(selectedId)}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, parentId: replyToId }),
        }),
      );
      setComments((list) => [...list, data.comment]);
      setCommentBody("");
      setReplyToId(null);
    } finally {
      setBusy(null);
    }
  }

  async function removeComment(id: string) {
    await fetch(`/api/wall/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
    setComments((list) =>
      list.filter((item) => item.id !== id && item.parentId !== id),
    );
    if (replyToId === id) setReplyToId(null);
  }

  async function unshare(id: string) {
    await fetch(`/api/wall/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotes((list) => list.filter((item) => item.id !== id));
    setSelectedId(null);
    setDetail(null);
  }

  async function reportNote(id: string) {
    if (busy || locked || !softPlus) return;
    setBusy(`flag:${id}`);
    try {
      const data = await readJson<{
        flagged?: boolean;
        note?: FullNote;
        error?: string;
      }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(id)}/flag`, {
          method: "POST",
        }),
      );
      if (data.note) {
        setDetail(data.note);
      } else if (data.flagged) {
        setDetail((current) =>
          current && current.id === id ? { ...current, flaggedByMe: true } : current,
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function shareLatest() {
    if (!latestOwnedReviewId || busy) return;
    setBusy("share-latest");
    setShareLatestError(null);
    try {
      const response = await fetch("/api/wall/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: latestOwnedReviewId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        wallNoteId?: string;
        error?: string;
      };
      if (!response.ok || !data.wallNoteId) {
        setShareLatestError(parseWallShareError(data.error));
        return;
      }
      setSharedToast(true);
      router.replace({ pathname: "/wall", query: { shared: "1" } });
      await loadNotes();
    } catch {
      setShareLatestError("generic");
    } finally {
      setBusy(null);
    }
  }

  async function togglePin(note: FullNote) {
    if (busy) return;
    setBusy("pin");
    try {
      const data = await readJson<{ note: FullNote }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(note.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: !note.pinned }),
        }),
      );
      setDetail(data.note);
      await loadNotes();
    } finally {
      setBusy(null);
    }
  }

  async function toggleBookmark(note: FullNote) {
    if (busy) return;
    setBusy("bookmark");
    try {
      const data = await readJson<{ note: FullNote; bookmarked: boolean }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(note.id)}/bookmark`, {
          method: "POST",
        }),
      );
      setDetail(data.note);
      setNotes((list) =>
        list.map((item) =>
          item.id === data.note.id
            ? { ...item, bookmarked: data.bookmarked }
            : item,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function placeSticker(stickerId: string) {
    if (!selectedId || busy) return;
    if ((inventory[stickerId] ?? 0) < 1) {
      setShopOpen(true);
      return;
    }
    setBusy(stickerId);
    try {
      const data = await readJson<{ note: FullNote; praiseCount: number }>(
        await fetch(`/api/wall/notes/${encodeURIComponent(selectedId)}/stickers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stickerId }),
        }),
      );
      setDetail(data.note);
      setNotes((list) =>
        list.map((item) => (item.id === data.note.id ? { ...item, ...data.note } : item)),
      );
      setInventory((current) => ({
        ...current,
        [stickerId]: Math.max(0, (current[stickerId] ?? 1) - 1),
      }));
      setInventoryCount((count) => Math.max(0, count - 1));
      setPlacedThisMonth((count) => count + 1);
    } catch {
      await loadShop();
    } finally {
      setBusy(null);
    }
  }

  async function buy(stickerId?: string, pack = false) {
    if (busy) return;
    setBusy(pack ? "pack" : stickerId ?? "pack");
    setShopError(null);
    try {
      const response = await fetch("/api/wall/stickers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerId, pack, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setShopError(data.error === "not_configured" ? "not_configured" : "generic");
    } catch {
      setShopError("generic");
    } finally {
      setBusy(null);
    }
  }

  if (!ready && !loadError) {
    return (
      <div className={`${SITE_SHELL_CLASS} pt-8`}>
        <WallSkeleton label={t("loading")} />
      </div>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h1 className="font-display text-3xl tracking-tight">{t("loadErrorTitle")}</h1>
        <p className="mt-3 max-w-md leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  return (
    <div className="pb-10">
      <div className={`${SITE_SHELL_CLASS} pt-4`}>
        <p className="font-display italic text-accent">{t("eyebrow")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
            <p className="mt-3 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
            <p className="mt-2 text-sm">
              <Link href="/guidelines" className="text-accent hover:text-foreground">
                {t("guidelinesLink")}
              </Link>
            </p>
            {softPlus ? (
              <p className="mt-3 text-sm text-muted">{t("dragHint")}</p>
            ) : null}
            {softPlus ? (
              <p className="mt-1 text-sm text-muted">{t("pinHint")}</p>
            ) : null}
            {softPlus ? (
              <p className="mt-2 text-sm text-muted" role="status">
                {t("placedThisMonth", { count: placedThisMonth })}
              </p>
            ) : null}
          </div>
          {softPlus ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/wall/saved"
                className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("savedLink")}
              </Link>
              {notes.length === 0 && latestOwnedReviewId ? (
                <button
                  type="button"
                  onClick={shareLatest}
                  disabled={busy !== null}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
                >
                  {busy === "share-latest" ? t("saving") : t("emptyShareCta")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShopOpen((open) => !open)}
                className="rounded-full bg-mint px-5 py-2.5 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-expanded={shopOpen}
                aria-controls="wall-shop-dialog"
              >
                {t("openShop")}
              </button>
            </div>
          ) : null}
        </div>
        {stickerSuccess ? (
          <p className="mt-4 rounded-[1.25rem] bg-mint/80 px-4 py-3 text-sm" role="status">
            {t("stickerSuccess")}
          </p>
        ) : null}
        {sharedToast ? (
          <p className="mt-4 rounded-[1.25rem] bg-peach px-4 py-3 text-sm" role="status">
            {t("sharedToast")}
          </p>
        ) : null}
        {softPlus && !locked ? (
          <div className="mt-6 space-y-4">
            <WallSpotlightStrip softPlus />
            <WallActivityStrip softPlus compact />
          </div>
        ) : null}
        {softPlus && !locked ? (
          <section
            className="mt-6 rounded-[1.75rem] bg-paper px-5 py-5 shadow-card sm:px-6"
            aria-labelledby="wall-filter-title"
          >
            <p id="wall-filter-title" className="font-display text-lg tracking-tight">
              {t("filterTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("filterLead")}</p>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
              role="search"
              aria-label={t("filterSearchLabel")}
            >
              <label className="block sm:col-span-1">
                <span className="sr-only">{t("filterSearchLabel")}</span>
                <input
                  type="search"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, query: event.target.value }))
                  }
                  placeholder={t("filterSearchPlaceholder")}
                  className="w-full rounded-full border border-line bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="shrink-0">{t("filterFeelingMin")}</span>
                <select
                  value={filters.feelingMin ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      feelingMin: normalizeFeelingBound(event.target.value),
                    }))
                  }
                  className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-foreground"
                >
                  <option value="">{t("filterFeelingAny")}</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`min-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="shrink-0">{t("filterFeelingMax")}</span>
                <select
                  value={filters.feelingMax ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      feelingMax: normalizeFeelingBound(event.target.value),
                    }))
                  }
                  className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-foreground"
                >
                  <option value="">{t("filterFeelingAny")}</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`max-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  writeHideDemoPreference(false);
                  setFilters(EMPTY_WALL_FILTERS);
                }}
                disabled={!filtersOn}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted disabled:opacity-40"
              >
                {t("filterClear")}
              </button>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={filters.hideDemo}
                onChange={(event) => {
                  const hideDemo = event.target.checked;
                  writeHideDemoPreference(hideDemo);
                  setFilters((current) => ({ ...current, hideDemo }));
                }}
                className="mt-1 h-4 w-4 rounded border-line accent-accent"
              />
              <span>
                <span className="block text-foreground">{t("filterHideDemo")}</span>
                <span className="mt-0.5 block text-xs text-muted">{t("filterHideDemoHint")}</span>
              </span>
            </label>
            {filtersOn ? (
              <p className="mt-3 text-sm text-muted">
                {t("filterResult", {
                  shown: visibleNotes.length,
                  total: notes.length,
                })}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className={`${SITE_SHELL_CLASS} relative mt-8`}>
        <div
          ref={scrollerRef}
          className="overflow-auto rounded-[1.5rem] border border-line/80 bg-paper/40 shadow-card overscroll-contain"
          style={{ height: "min(70vh, 44rem)" }}
        >
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width: WALL_CANVAS.width,
              height: WALL_CANVAS.height,
              backgroundImage:
                "radial-gradient(circle at 20px 20px, rgba(196,127,110,0.12) 1.2px, transparent 1.6px)",
              backgroundSize: "42px 42px",
            }}
          >
            {notes.length === 0 ? (
              <div className="absolute left-8 top-8 max-w-md">
                {softPlus ? (
                  <section className="rounded-[2rem] bg-peach/70 px-8 py-12 shadow-card">
                    <h2 className="font-display text-2xl tracking-tight">{t("emptyTitle")}</h2>
                    <p className="mt-3 max-w-md leading-relaxed text-muted">{t("empty")}</p>
                    {latestOwnedReviewId ? (
                      <p className="mt-3 text-sm text-muted">{t("emptyShareHint")}</p>
                    ) : null}
                    <div className="mt-8 flex flex-wrap gap-3">
                      {latestOwnedReviewId ? (
                        <button
                          type="button"
                          onClick={shareLatest}
                          disabled={busy !== null}
                          className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 py-3 text-sm text-paper shadow-card disabled:opacity-60 sm:text-base"
                        >
                          {busy === "share-latest" ? t("saving") : t("emptyShareCta")}
                        </button>
                      ) : (
                        <Link
                          href="/review"
                          className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 py-3 text-sm text-paper shadow-card sm:text-base"
                        >
                          {t("emptyWriteCta")}
                        </Link>
                      )}
                      <Link
                        href="/history"
                        className="inline-flex min-h-12 items-center rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                      >
                        {t("emptyCta")}
                      </Link>
                    </div>
                    {shareLatestError ? (
                      <p className="mt-4 text-sm text-accent" role="alert">
                        {shareErrorCopy(t, shareLatestError)}
                      </p>
                    ) : null}
                  </section>
                ) : (
                  <EmptyState
                    title={t("emptyTitle")}
                    body={t("empty")}
                    ctaHref="/history"
                    ctaLabel={t("emptyCta")}
                    wash="bg-peach/70"
                  />
                )}
              </div>
            ) : null}
            {notes.length > 0 && visibleNotes.length === 0 ? (
              <div className="absolute left-8 top-8 max-w-md rounded-[2rem] bg-cream/90 px-8 py-10 shadow-card">
                <h2 className="font-display text-2xl tracking-tight">{t("filterEmptyTitle")}</h2>
                <p className="mt-3 leading-relaxed text-muted">{t("filterEmpty")}</p>
                <button
                  type="button"
                  onClick={() => {
                    writeHideDemoPreference(false);
                    setFilters(EMPTY_WALL_FILTERS);
                  }}
                  className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
                >
                  {t("filterClear")}
                </button>
              </div>
            ) : null}
            {visibleNotes.map((note) => {
              const full = "excerpt" in note ? (note as FullNote) : null;
              const author = wallAuthorLabel(
                note,
                t("softVisitor"),
                Boolean(full),
              );
              return (
                <button
                  key={note.id}
                  type="button"
                  data-note-id={note.id}
                  onPointerDown={(event) => onPointerDown(event, note)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(event) => onPointerUp(event, note)}
                  onPointerCancel={(event) => {
                    drag.current = null;
                    setScrollerLock(false);
                    try {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    } catch {
                      // already released
                    }
                  }}
                  className={`absolute w-[216px] cursor-grab touch-none select-none rounded-[1.4rem] px-4 py-4 text-left shadow-card active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${noteClass(note.color)} ${locked ? "pointer-events-none select-none" : ""}`}
                  aria-label={
                    full
                      ? t("noteAria", { excerpt: full.excerpt || t("untitled") })
                      : t("noteLockedAria")
                  }
                  aria-haspopup={full ? "dialog" : undefined}
                  aria-expanded={full ? selectedId === note.id : undefined}
                  style={{
                    left: note.x,
                    top: note.y,
                    zIndex: note.z,
                    transform: `rotate(${tiltFor(note.id)}deg)`,
                  }}
                >
                  <span
                    className="absolute left-1/2 top-0 h-4 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{t("dragHandle")}</span>
                  <span className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-muted">{t("byAuthor", { name: author })}</span>
                      {full?.ownerInviteBadge ? (
                        <span
                          className="shrink-0 text-accent"
                          title={t("inviteBadge")}
                          aria-label={t("inviteBadge")}
                        >
                          ✦
                        </span>
                      ) : null}
                    </span>
                    {full?.pinned ? (
                      <span className="shrink-0 rounded-full bg-paper/80 px-2 py-0.5 text-muted">
                        {t("pinned")}
                      </span>
                    ) : null}
                    {full?.bookmarked ? (
                      <span
                        className="shrink-0 text-accent"
                        title={t("saved")}
                        aria-label={t("saved")}
                      >
                        ♥
                      </span>
                    ) : null}
                  </span>
                  {locked || !full ? (
                    <span className="mt-2 block space-y-2 blur-[3px]">
                      <span className="block h-3 w-4/5 rounded-full bg-foreground/15" />
                      <span className="block h-3 w-full rounded-full bg-foreground/10" />
                      <span className="block h-3 w-2/3 rounded-full bg-foreground/10" />
                      <span className="mt-6 block h-16 rounded-2xl bg-paper/50" />
                    </span>
                  ) : (
                    <>
                      {full.ownerSoftPlus ? (
                        <span className="mt-1 inline-flex rounded-full bg-mint/90 px-2 py-0.5 text-[11px]">
                          {t("plusBadge")}
                        </span>
                      ) : null}
                      <span className="mt-2 line-clamp-5 text-sm leading-relaxed">
                        {full.excerpt || t("untitled")}
                      </span>
                      <span className="mt-4 flex items-center justify-between text-xs text-muted">
                        <span>
                          {full.feeling
                            ? t("feeling", { value: full.feeling })
                            : full.mine
                              ? t("yours")
                              : t("neighbor")}
                        </span>
                        <span aria-label={t("praise", { count: note.praiseCount })}>
                          {full.stickers?.[0]?.emoji ?? "♡"} {note.praiseCount}
                        </span>
                      </span>
                      {full.stickers?.length ? (
                        <span className="mt-2 flex flex-wrap gap-1 text-base">
                          {full.stickers.slice(0, 6).map((sticker) => (
                            <span key={sticker.stickerId}>
                              {sticker.emoji}
                              {sticker.count > 1 ? (
                                <span className="text-[10px] text-muted">×{sticker.count}</span>
                              ) : null}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {locked ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6">
            <div className="pointer-events-auto max-w-md rounded-[2rem] bg-paper/95 px-6 py-8 text-center shadow-soft">
              <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
              <p className="mt-3 leading-relaxed text-muted">
                {signedIn ? t("lockedBody") : t("signedOutBody")}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/pricing"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
                >
                  {t("lockedCta")}
                </Link>
                {!signedIn ? (
                  <Link
                    href={{ pathname: "/login", query: { next: "/wall" } }}
                    className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                  >
                    {t("loginCta")}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {softPlus && shopOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/20 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeShop();
          }}
        >
          <div
            id="wall-shop-dialog"
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[2rem] bg-paper px-6 py-6 shadow-soft sm:px-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wall-shop-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="wall-shop-title" className="font-display text-2xl tracking-tight">
                  {t("shopTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t("shopLead")}</p>
                <p className="mt-2 text-sm text-muted" role="status">
                  {t("placedThisMonth", { count: placedThisMonth })}
                </p>
              </div>
              <button
                ref={shopCloseRef}
                type="button"
                onClick={closeShop}
                className="min-h-11 min-w-11 text-sm text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={t("close")}
              >
                {t("close")}
              </button>
            </div>
            {inventoryCount === 0 ? (
              <div className="mt-6 rounded-[1.35rem] bg-cream/80 px-5 py-5" role="status">
                <p className="font-display text-lg tracking-tight">{t("inventoryEmptyTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t("inventoryEmptyBody")}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted" role="status">
                {t("inventoryCount", { count: inventoryCount })}
              </p>
            )}
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {stickers.map((sticker) => (
                <li
                  key={sticker.id}
                  className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-peach/50 px-4 py-3"
                >
                  <div>
                    <p className="font-display text-lg">
                      {sticker.emoji}{" "}
                      {tStickers(
                        sticker.slug as
                          | "star"
                          | "heart"
                          | "sprout"
                          | "tea"
                          | "moon"
                          | "cloud"
                          | "peach"
                          | "sparkle",
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {sticker.formatted} · {t("owned", { count: inventory[sticker.id] ?? 0 })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => buy(sticker.id)}
                    disabled={busy !== null}
                    className="rounded-full bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {busy === sticker.id ? t("redirecting") : t("buy")}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => buy(undefined, true)}
              disabled={busy !== null}
              className="mt-5 rounded-full bg-mint px-5 py-2.5 text-sm shadow-card disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {busy === "pack"
                ? t("redirecting")
                : packLabel
                  ? t("buyPackPrice", { price: packLabel })
                  : t("buyPack")}
            </button>
            {shopError === "not_configured" ? (
              <p className="mt-3 text-sm text-muted">{t("paymentsOff")}</p>
            ) : null}
            {shopError === "generic" ? (
              <p className="mt-3 text-sm text-accent">{t("checkoutError")}</p>
            ) : null}
            {!stripeConfigured && !shopError ? (
              <p className="mt-3 text-sm text-muted">{t("paymentsOff")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedId && detail ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/20 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeNoteDetail();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[2rem] bg-paper px-6 py-6 shadow-soft sm:px-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wall-note-title"
          >
            <div className="flex items-start justify-between gap-4">
              <p id="wall-note-title" className="font-display text-2xl tracking-tight">
                {detail.summary.trim() || t("untitled")}
              </p>
              <button
                ref={noteCloseRef}
                type="button"
                onClick={closeNoteDetail}
                className="min-h-11 min-w-11 text-sm text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={t("close")}
              >
                {t("close")}
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">
              {`${t("byAuthor", { name: wallAuthorLabel(detail, t("softVisitor"), true) })} · `}
              {detail.ownerSoftPlus ? `${t("plusBadge")} · ` : ""}
              {detail.ownerInviteBadge ? `${t("inviteBadge")} · ` : ""}
              {detail.feeling ? t("feeling", { value: detail.feeling }) : null}
              {detail.mine ? ` · ${t("yours")}` : ` · ${t("neighbor")}`}
              {` · ${t("praise", { count: detail.praiseCount })}`}
              {detail.pinned ? ` · ${t("pinned")}` : ""}
              {detail.bookmarked ? ` · ${t("saved")}` : ""}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => toggleBookmark(detail)}
                disabled={busy !== null}
                aria-pressed={Boolean(detail.bookmarked)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm shadow-card disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  detail.bookmarked ? "bg-blush" : "bg-cream"
                }`}
              >
                <span aria-hidden="true">{detail.bookmarked ? "♥" : "♡"}</span>
                {detail.bookmarked ? t("unsave") : t("save")}
              </button>
            </div>
            <dl className="mt-6 space-y-4 text-sm leading-relaxed">
              {(["energy", "drain", "lessOf", "priorities"] as const).map((field) => (
                <div key={field}>
                  <dt className="text-muted">{tQuestions(field)}</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{detail[field]?.trim() || "—"}</dd>
                </div>
              ))}
            </dl>
            {detail.stickers?.length ? (
              <p className="mt-4 text-lg">
                {detail.stickers.map((sticker) => (
                  <span key={sticker.stickerId} className="mr-2">
                    {sticker.emoji}
                    {sticker.count > 1 ? `×${sticker.count}` : ""}
                  </span>
                ))}
              </p>
            ) : null}

            <div className="mt-6">
              <p className="text-sm text-muted">{t("placeHint")}</p>
              {inventoryCount === 0 ? (
                <div className="mt-3 rounded-[1.25rem] bg-cream/80 px-4 py-4" role="status">
                  <p className="text-sm leading-relaxed text-muted">
                    {t("inventoryEmptyPlace")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShopOpen(true)}
                    className="mt-3 rounded-full bg-mint px-4 py-2 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {t("openShop")}
                  </button>
                </div>
              ) : (
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label={t("placeHint")}
                >
                  {stickers.map((sticker) => {
                    const owned = inventory[sticker.id] ?? 0;
                    return (
                      <button
                        key={sticker.id}
                        type="button"
                        onClick={() => placeSticker(sticker.id)}
                        disabled={busy !== null || owned < 1}
                        className="rounded-full bg-blush px-3 py-1.5 text-sm disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        title={t("owned", { count: owned })}
                        aria-label={t("placeStickerAria", {
                          name: tStickers(
                            sticker.slug as
                              | "star"
                              | "heart"
                              | "sprout"
                              | "tea"
                              | "moon"
                              | "cloud"
                              | "peach"
                              | "sparkle",
                          ),
                          count: owned,
                        })}
                      >
                        {sticker.emoji} {owned}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <section className="mt-8">
              <h3 className="font-display text-xl">{t("commentsTitle")}</h3>
              {comments.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("noComments")}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {comments
                    .filter((comment) => !comment.parentId)
                    .map((comment) => {
                      const replies = comments.filter((item) => item.parentId === comment.id);
                      return (
                        <li key={comment.id} className="rounded-2xl bg-peach/40 px-4 py-3 text-sm">
                          <p className="leading-relaxed">{comment.body}</p>
                          <p className="mt-1 text-xs text-muted">
                            {comment.mine ? t("yours") : t("neighbor")}
                            {" · "}
                            <button
                              type="button"
                              onClick={() => setReplyToId(comment.id)}
                              className="min-h-11 text-accent"
                            >
                              {t("reply")}
                            </button>
                            {comment.mine ? (
                              <>
                                {" · "}
                                <button
                                  type="button"
                                  onClick={() => removeComment(comment.id)}
                                  className="min-h-11 text-accent"
                                >
                                  {t("deleteComment")}
                                </button>
                              </>
                            ) : null}
                          </p>
                          {replies.length > 0 ? (
                            <ul className="mt-3 space-y-2 border-l border-line/80 pl-3">
                              {replies.map((reply) => (
                                <li
                                  key={reply.id}
                                  className="rounded-2xl bg-paper/80 px-3 py-2"
                                >
                                  <p className="leading-relaxed">{reply.body}</p>
                                  <p className="mt-1 text-xs text-muted">
                                    {reply.mine ? t("yours") : t("neighbor")}
                                    {reply.mine ? (
                                      <>
                                        {" · "}
                                        <button
                                          type="button"
                                          onClick={() => removeComment(reply.id)}
                                          className="min-h-11 text-accent"
                                        >
                                          {t("deleteComment")}
                                        </button>
                                      </>
                                    ) : null}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              )}
              <form onSubmit={sendComment} className="mt-4 flex flex-col gap-2">
                {replyToId ? (
                  <p className="text-xs text-muted">
                    {t("replying")}{" "}
                    <button
                      type="button"
                      onClick={() => setReplyToId(null)}
                      className="text-accent"
                    >
                      {t("cancelReply")}
                    </button>
                  </p>
                ) : null}
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={replyToId ? t("replyPlaceholder") : t("commentPlaceholder")}
                  className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={busy !== null || !commentBody.trim()}
                  className="inline-flex min-h-11 items-center self-start rounded-full bg-accent px-4 py-2 text-sm text-paper disabled:opacity-60"
                >
                  {replyToId ? t("replySubmit") : t("commentSubmit")}
                </button>
              </form>
            </section>

            {detail.mine ? (
              <div className="mt-6 space-y-3 rounded-[1.5rem] bg-cream/80 px-4 py-4">
                <p className="font-display text-lg tracking-tight">{t("unshareTitle")}</p>
                <p className="text-sm leading-relaxed text-muted">{t("unshareHint")}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => togglePin(detail)}
                    disabled={busy !== null}
                    className="inline-flex min-h-11 items-center rounded-full bg-mint px-4 py-2 text-sm shadow-card disabled:opacity-60"
                  >
                    {detail.pinned ? t("unpin") : t("pin")}
                  </button>
                  <button
                    type="button"
                    onClick={() => unshare(detail.id)}
                    disabled={busy !== null}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 py-2 text-sm text-muted shadow-card hover:text-foreground disabled:opacity-60"
                  >
                    {t("unshare")}
                  </button>
                </div>
              </div>
            ) : softPlus && !locked ? (
              <div className="mt-6 space-y-2 border-t border-line/70 pt-5">
                {detail.flaggedByMe ? (
                  <p className="text-sm text-muted" role="status">
                    {t("reportThanks")}
                  </p>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-muted">{t("reportHint")}</p>
                    <button
                      type="button"
                      onClick={() => void reportNote(detail.id)}
                      disabled={busy !== null}
                      className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
                    >
                      {t("reportFeelsOff")}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
