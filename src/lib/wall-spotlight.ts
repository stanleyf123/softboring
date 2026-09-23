import { isDemoEmail } from "@/lib/demo";
import { noteExcerpt } from "@/lib/wall-canvas";
import { emailLocalFallback, wallOwnerNickname } from "@/lib/nickname";

export type SoftSpotlightReason = "pinned" | "praise";

export type SoftSpotlightSourceNote = {
  id: string;
  summary: string;
  energy: string;
  praiseCount: number;
  pinned: boolean;
  feeling: number | null;
  createdAt: string;
  updatedAt?: string;
  ownerNickname: string | null;
  ownerEmail: string | null;
  ownerIsDemo?: boolean;
};

export type SoftSpotlightPick = {
  noteId: string;
  excerpt: string;
  praiseCount: number;
  pinned: boolean;
  feeling: number | null;
  ownerNickname: string | null;
  ownerFallback: string | null;
  ownerIsDemo: boolean;
  reason: SoftSpotlightReason;
};

const DEFAULT_LIMIT = 5;
const MIN_PRAISE = 1;

/** How long one public note rests before a guest sees the next. */
export const GUEST_SPOTLIGHT_INTERVAL_MS = 12_000;

/**
 * A calm index into a short public list. The same clock shows the same note.
 * Reduced motion can keep this index still instead of ticking forward.
 */
export function rotatingSpotlightIndex(
  count: number,
  nowMs: number,
  intervalMs = GUEST_SPOTLIGHT_INTERVAL_MS,
) {
  if (!Number.isFinite(count) || count <= 0) return 0;
  const size = Math.floor(count);
  const interval =
    Number.isFinite(intervalMs) && intervalMs >= 1000
      ? intervalMs
      : GUEST_SPOTLIGHT_INTERVAL_MS;
  const now = Number.isFinite(nowMs) && nowMs > 0 ? nowMs : 0;
  const step = Math.floor(now / interval);
  return ((step % size) + size) % size;
}

export function pickRotatingSpotlight<T>(
  items: readonly T[],
  nowMs: number,
  intervalMs?: number,
): T | null {
  if (items.length === 0) return null;
  return items[rotatingSpotlightIndex(items.length, nowMs, intervalMs)] ?? null;
}

/** Public card only. Nicknames and excerpts — never an email field. */
export function toPublicSpotlightCard(pick: SoftSpotlightPick): SoftSpotlightPick {
  return {
    noteId: pick.noteId,
    excerpt: pick.excerpt,
    praiseCount: pick.praiseCount,
    pinned: pick.pinned,
    feeling: pick.feeling,
    ownerNickname: pick.ownerNickname,
    ownerFallback: pick.ownerFallback,
    ownerIsDemo: Boolean(pick.ownerIsDemo),
    reason: pick.reason === "pinned" ? "pinned" : "praise",
  };
}

/**
 * Gentle weekly spotlight: pinned notes first, then high-praise neighbors.
 * Caps the list so Soft Wall stays calm — not algorithmic spam.
 */
export function pickSoftWallSpotlight(
  notes: SoftSpotlightSourceNote[],
  options?: { limit?: number; minPraise?: number },
): SoftSpotlightPick[] {
  const limit = Math.max(1, Math.min(8, options?.limit ?? DEFAULT_LIMIT));
  const minPraise = options?.minPraise ?? MIN_PRAISE;
  const seen = new Set<string>();
  const picks: SoftSpotlightPick[] = [];

  const toPick = (
    note: SoftSpotlightSourceNote,
    reason: SoftSpotlightReason,
  ): SoftSpotlightPick => ({
    noteId: note.id,
    excerpt: noteExcerpt(note.summary, note.energy),
    praiseCount: note.praiseCount,
    pinned: note.pinned,
    feeling: note.feeling,
    ownerNickname: wallOwnerNickname(note.ownerNickname, note.ownerEmail, {
      allowEmailFallback: false,
    }),
    ownerFallback: emailLocalFallback(note.ownerEmail),
    ownerIsDemo: Boolean(note.ownerIsDemo) || isDemoEmail(note.ownerEmail),
    reason,
  });

  const pinned = notes
    .filter((note) => note.pinned)
    .sort((a, b) => b.praiseCount - a.praiseCount || a.id.localeCompare(b.id));

  for (const note of pinned) {
    if (picks.length >= limit) break;
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    picks.push(toPick(note, "pinned"));
  }

  const praised = notes
    .filter((note) => !seen.has(note.id) && note.praiseCount >= minPraise)
    .sort(
      (a, b) =>
        b.praiseCount - a.praiseCount ||
        new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime() ||
        a.id.localeCompare(b.id),
    );

  for (const note of praised) {
    if (picks.length >= limit) break;
    seen.add(note.id);
    picks.push(toPick(note, "praise"));
  }

  return picks;
}
