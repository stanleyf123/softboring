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
};

export type SoftSpotlightPick = {
  noteId: string;
  excerpt: string;
  praiseCount: number;
  pinned: boolean;
  feeling: number | null;
  ownerNickname: string | null;
  ownerFallback: string | null;
  reason: SoftSpotlightReason;
};

const DEFAULT_LIMIT = 5;
const MIN_PRAISE = 1;

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
