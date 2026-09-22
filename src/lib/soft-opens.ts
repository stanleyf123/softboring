import type { PublicCapsule } from "@/lib/soft-capsule";
import {
  calendarInTimeZone,
  normalizeTimeZone,
  startOfIsoWeek,
  zonedMidnightToUtc,
} from "@/lib/timezone";

export type OpenedCapsule = {
  id: string;
  unlockAt: string;
  body: string;
};

/** Monday 00:00 through the next Monday 00:00, in the member's timezone. */
export function isoWeekWindow(now: Date, timeZone?: string | null) {
  const zone = normalizeTimeZone(timeZone);
  const start = startOfIsoWeek(now, zone);
  const startCal = calendarInTimeZone(start, zone);
  const next = new Date(Date.UTC(startCal.year, startCal.month - 1, startCal.day + 7));
  const end = zonedMidnightToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    zone,
  );
  return { start, end, timeZone: zone };
}

/**
 * Capsules whose unlock moment already passed, and landed inside this ISO week.
 * Sealed notes — and any payload that still hides the words — stay out.
 */
export function capsulesOpenedThisWeek(
  capsules: ReadonlyArray<Pick<PublicCapsule, "id" | "unlockAt" | "sealed"> & { body?: string }>,
  now: Date,
  timeZone?: string | null,
): OpenedCapsule[] {
  const { start, end } = isoWeekWindow(now, timeZone);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const nowMs = now.getTime();
  const opened: OpenedCapsule[] = [];

  for (const capsule of capsules) {
    if (capsule.sealed) continue;
    const unlock = Date.parse(capsule.unlockAt);
    if (!Number.isFinite(unlock) || unlock > nowMs) continue;
    if (unlock < startMs || unlock >= endMs) continue;
    const body = typeof capsule.body === "string" ? capsule.body.trim() : "";
    if (!body) continue;
    opened.push({ id: capsule.id, unlockAt: capsule.unlockAt, body });
  }

  opened.sort((left, right) => {
    const byUnlock = Date.parse(right.unlockAt) - Date.parse(left.unlockAt);
    if (byUnlock !== 0) return byUnlock;
    return left.id.localeCompare(right.id);
  });
  return opened;
}
