import { calendarInTimeZone, normalizeTimeZone } from "@/lib/timezone";

export type CapsuleDayHint = {
  unlockOn: string;
  sealed: number;
  open: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Local calendar day for a capsule unlock. Invalid timestamps are skipped. */
export function capsuleUnlockDay(unlockAt: string, timeZone?: string | null): string | null {
  const ms = Date.parse(unlockAt);
  if (!Number.isFinite(ms)) return null;
  const calendar = calendarInTimeZone(new Date(ms), normalizeTimeZone(timeZone));
  return `${String(calendar.year).padStart(4, "0")}-${pad(calendar.month)}-${pad(calendar.day)}`;
}

/**
 * Soft calendar marks only. Sealed words are never copied into the hint.
 */
export function buildCapsuleDayHints(
  capsules: ReadonlyArray<{ unlockAt: string; sealed: boolean }>,
  timeZone?: string | null,
): CapsuleDayHint[] {
  const days = new Map<string, CapsuleDayHint>();
  for (const capsule of capsules) {
    const unlockOn = capsuleUnlockDay(capsule.unlockAt, timeZone);
    if (!unlockOn) continue;
    const current = days.get(unlockOn) ?? { unlockOn, sealed: 0, open: 0 };
    if (capsule.sealed) current.sealed += 1;
    else current.open += 1;
    days.set(unlockOn, current);
  }
  return [...days.values()].sort((left, right) => left.unlockOn.localeCompare(right.unlockOn));
}
