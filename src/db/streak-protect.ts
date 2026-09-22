import { getDb } from "./client";
import { listReviewCreatedAts } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { isWeekPaused, listPauseWeekKeys, setWeekPaused } from "@/db/week-pauses";
import {
  describeStreakRisk,
  isMonthKey,
  streakProtectView,
  type StreakProtectView,
} from "@/lib/streak-protect";

export function hasStreakProtectToken(userId: string, monthKey: string) {
  if (!isMonthKey(monthKey)) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM streak_protect_tokens WHERE user_id = ? AND month_key = ?`,
    )
    .get(userId, monthKey) as { ok: number } | undefined;
  return Boolean(row);
}

export function readStreakProtect(
  userId: string,
  softPlus: boolean,
  now = new Date(),
): StreakProtectView {
  const settings = ensureUserSettings(userId);
  const risk = describeStreakRisk({
    createdAts: listReviewCreatedAts(userId),
    pausedWeeks: listPauseWeekKeys(userId),
    now,
    timeZone: settings.timezone,
  });
  return streakProtectView({
    softPlus,
    risk,
    usedThisMonth: hasStreakProtectToken(userId, risk.monthKey),
  });
}

export type UseStreakProtectResult =
  | { ok: true; view: StreakProtectView }
  | {
      ok: false;
      reason: "soft_plus_required" | "not_at_risk" | "already_used";
      view: StreakProtectView;
    };

/**
 * Spend this month's token by pausing the current week.
 * The pause row is the same one the pause-week card uses.
 */
export function spendStreakProtectToken(
  userId: string,
  softPlus: boolean,
  now = new Date(),
): UseStreakProtectResult {
  const current = readStreakProtect(userId, softPlus, now);
  if (!softPlus) {
    return { ok: false, reason: "soft_plus_required", view: current };
  }
  if (!current.atRisk || current.paused || isWeekPaused(userId, current.weekKey)) {
    return { ok: false, reason: "not_at_risk", view: readStreakProtect(userId, softPlus, now) };
  }
  if (current.usedThisMonth) {
    return { ok: false, reason: "already_used", view: current };
  }

  const db = getDb();
  const createdAt = now.toISOString();
  const wrote = db.transaction(() => {
    const inserted = db
      .prepare(
        `INSERT INTO streak_protect_tokens (user_id, month_key, week_key, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, month_key) DO NOTHING`,
      )
      .run(userId, current.monthKey, current.weekKey, createdAt);
    if (inserted.changes !== 1) return false;
    setWeekPaused(userId, current.weekKey, true);
    return true;
  })();

  const view = readStreakProtect(userId, softPlus, now);
  if (!wrote) return { ok: false, reason: "already_used", view };
  return { ok: true, view };
}
