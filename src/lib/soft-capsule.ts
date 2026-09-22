import {
  calendarInTimeZone,
  normalizeTimeZone,
  zonedMidnightToUtc,
} from "@/lib/timezone";

/** A short note, not a journal entry. */
export const CAPSULE_MAX = 280;

/** Enough for a small shelf. */
export const CAPSULE_CAP = 24;

/** Five quiet years is as far as a capsule reaches. */
export const CAPSULE_MAX_DAYS = 365 * 5;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type SoftCapsule = {
  id: string;
  body: string;
  unlockAt: string;
  createdAt: string;
};

export type PublicCapsule = {
  id: string;
  createdAt: string;
  unlockAt: string;
  sealed: boolean;
  body?: string;
};

export function parseCapsuleBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, CAPSULE_MAX).join("").trim() || null;
}

function padDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addCalendarDays(year: number, month: number, day: number, days: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function capsuleDateBounds(now: Date, timeZone?: string | null) {
  const zone = normalizeTimeZone(timeZone);
  const today = calendarInTimeZone(now, zone);
  const min = addCalendarDays(today.year, today.month, today.day, 1);
  const max = addCalendarDays(today.year, today.month, today.day, CAPSULE_MAX_DAYS);
  return {
    timeZone: zone,
    minUnlockOn: padDate(min.year, min.month, min.day),
    maxUnlockOn: padDate(max.year, max.month, max.day),
  };
}

/**
 * A calendar day strictly after today in the member's timezone.
 * Returns the UTC instant of that local midnight — the moment the capsule may open.
 */
export function parseUnlockOn(
  value: unknown,
  now: Date,
  timeZone?: string | null,
): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const zone = normalizeTimeZone(timeZone);
  const bounds = capsuleDateBounds(now, zone);
  if (value < bounds.minUnlockOn || value > bounds.maxUnlockOn) return null;

  const instant = zonedMidnightToUtc(year, month, day, zone);
  const seen = calendarInTimeZone(instant, zone);
  if (seen.year !== year || seen.month !== month || seen.day !== day) return null;
  return instant.toISOString();
}

/** Open only when the clock has reached unlock_at. A bad timestamp stays sealed. */
export function capsuleIsOpen(unlockAt: string, now: Date): boolean {
  const unlock = Date.parse(unlockAt);
  if (!Number.isFinite(unlock)) return false;
  return now.getTime() >= unlock;
}

/** Sealed capsules leave the words out of the payload entirely. */
export function toPublicCapsule(capsule: SoftCapsule, now: Date): PublicCapsule {
  const sealed = !capsuleIsOpen(capsule.unlockAt, now);
  const base = {
    id: capsule.id,
    createdAt: capsule.createdAt,
    unlockAt: capsule.unlockAt,
    sealed,
  };
  if (sealed) return base;
  return { ...base, body: capsule.body };
}

export function sortPublicCapsules(capsules: PublicCapsule[]): PublicCapsule[] {
  return [...capsules].sort((left, right) => {
    if (left.sealed !== right.sealed) return left.sealed ? 1 : -1;
    const byUnlock = Date.parse(left.unlockAt) - Date.parse(right.unlockAt);
    if (byUnlock !== 0) return byUnlock;
    return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  });
}
