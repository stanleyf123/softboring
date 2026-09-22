import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import { calendarInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { noteExcerpt } from "@/lib/wall-canvas";

export type MemoryLaneReview = {
  id: string;
  createdAt: string;
  summary: string;
  energy: string;
};

export type MemoryLaneNote = {
  id: string;
  reviewId: string;
  createdAt: string;
  summary: string;
  energy: string;
  hidden: boolean;
};

export type MemoryLane = {
  source: "wall" | "review";
  id: string;
  noteId: string | null;
  createdAt: string;
  excerpt: string;
  locked: boolean;
  hidden: boolean;
};

export type MemoryLaneTarget = {
  year: number;
  month: number;
  day: number;
};

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The same calendar day one month ago. Short months land on the last real day. */
export function sameDayLastMonth(now: Date, timeZone: string): MemoryLaneTarget {
  const today = calendarInTimeZone(now, normalizeTimeZone(timeZone));
  const year = today.month === 1 ? today.year - 1 : today.year;
  const month = today.month === 1 ? 12 : today.month - 1;
  return {
    year,
    month,
    day: Math.min(today.day, daysInMonth(year, month)),
  };
}

export function matchesCalendarDay(iso: string, target: MemoryLaneTarget, timeZone: string) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  const seen = calendarInTimeZone(new Date(at), timeZone);
  return seen.year === target.year && seen.month === target.month && seen.day === target.day;
}

function historyOpen(index: number | undefined, softPlus: boolean) {
  return softPlus || (index != null && index < FREE_HISTORY_LIMIT);
}

/**
 * One private look-back for this calendar day last month.
 * A wall note from that day comes first. `notes` and reviews are newest-first.
 */
export function pickMemoryLane(input: {
  enabled: boolean;
  reviewsNewestFirst: MemoryLaneReview[];
  notes: MemoryLaneNote[];
  softPlus: boolean;
  timeZone: string;
  now?: Date;
}): MemoryLane | null {
  if (!input.enabled) return null;
  const now = input.now ?? new Date();
  const zone = normalizeTimeZone(input.timeZone);
  const target = sameDayLastMonth(now, zone);
  const indexById = new Map(input.reviewsNewestFirst.map((review, index) => [review.id, index]));

  const note = input.notes.find((item) => matchesCalendarDay(item.createdAt, target, zone));
  if (note) {
    const open = !note.hidden || historyOpen(indexById.get(note.reviewId), input.softPlus);
    return {
      source: "wall",
      id: note.reviewId,
      noteId: note.id,
      createdAt: note.createdAt,
      excerpt: open ? noteExcerpt(note.summary, note.energy) : "",
      locked: !open,
      hidden: note.hidden,
    };
  }

  const review = input.reviewsNewestFirst.find((item) =>
    matchesCalendarDay(item.createdAt, target, zone),
  );
  if (!review) return null;
  const open = historyOpen(indexById.get(review.id), input.softPlus);
  return {
    source: "review",
    id: review.id,
    noteId: null,
    createdAt: review.createdAt,
    excerpt: open ? noteExcerpt(review.summary, review.energy) : "",
    locked: !open,
    hidden: false,
  };
}
