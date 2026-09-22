import { getDb } from "./client";
import {
  normalizeCustomQuestions,
  parseCustomQuestionsJson,
  type CustomQuestion,
} from "@/lib/custom-questions";
import { nextOnboardingTimezoneSet } from "@/lib/onboarding-progress";
import { normalizeTimeZone, reminderIsDue } from "@/lib/timezone";
import {
  storedFocusChime,
  storedFocusMinutes,
  type FocusMinutes,
} from "@/lib/focus-timer";
import { isWallColor, type WallColor } from "@/lib/wall-canvas";

export type UserSettings = {
  userId: string;
  onboardingDismissed: boolean;
  onboardingHistorySeen: boolean;
  onboardingWallSeen: boolean;
  onboardingTimezoneSet: boolean;
  reminderEnabled: boolean;
  reminderWeekday: number;
  reminderLastSentAt: string | null;
  customQuestions: CustomQuestion[];
  preferredWallColor: WallColor | null;
  timezone: string;
  seasonalFrame: boolean;
  focusMinutes: FocusMinutes;
  focusChime: boolean;
  nightMode: boolean;
  memoryLane: boolean;
};

type SettingsRow = {
  user_id: string;
  onboarding_dismissed: number;
  onboarding_history_seen: number;
  onboarding_wall_seen: number;
  onboarding_timezone_set: number;
  reminder_enabled: number;
  reminder_weekday: number;
  reminder_last_sent_at: string | null;
  custom_questions: string | null;
  preferred_wall_color: string | null;
  timezone: string | null;
  seasonal_frame: number;
  focus_minutes: number | null;
  focus_chime: number | null;
  night_mode: number | null;
  memory_lane: number | null;
};

function parsePreferredWallColor(value: string | null | undefined): WallColor | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isWallColor(trimmed) ? trimmed : null;
}

function toSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    onboardingDismissed: Boolean(row.onboarding_dismissed),
    onboardingHistorySeen: Boolean(row.onboarding_history_seen),
    onboardingWallSeen: Boolean(row.onboarding_wall_seen),
    onboardingTimezoneSet: Boolean(row.onboarding_timezone_set),
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderWeekday: clampWeekday(row.reminder_weekday),
    reminderLastSentAt: row.reminder_last_sent_at,
    customQuestions: parseCustomQuestionsJson(row.custom_questions),
    preferredWallColor: parsePreferredWallColor(row.preferred_wall_color),
    timezone: normalizeTimeZone(row.timezone),
    seasonalFrame: Boolean(row.seasonal_frame),
    focusMinutes: storedFocusMinutes(row.focus_minutes),
    focusChime: storedFocusChime(row.focus_chime),
    nightMode: Boolean(row.night_mode),
    memoryLane: row.memory_lane == null ? true : Boolean(row.memory_lane),
  };
}

export function clampWeekday(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return 0;
  return n;
}

export function ensureUserSettings(userId: string): UserSettings {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`,
    )
    .run(userId);
  const row = getDb()
    .prepare(`SELECT * FROM user_settings WHERE user_id = ?`)
    .get(userId) as SettingsRow;
  return toSettings(row);
}

export type SettingsPatch = {
  onboardingDismissed?: boolean;
  onboardingHistorySeen?: boolean;
  onboardingWallSeen?: boolean;
  onboardingTimezoneSet?: boolean;
  reminderEnabled?: boolean;
  reminderWeekday?: number;
  reminderLastSentAt?: string | null;
  customQuestions?: CustomQuestion[];
  preferredWallColor?: WallColor | null;
  timezone?: string;
  seasonalFrame?: boolean;
  focusMinutes?: FocusMinutes;
  focusChime?: boolean;
  nightMode?: boolean;
  memoryLane?: boolean;
};

export function updateUserSettings(userId: string, patch: SettingsPatch): UserSettings {
  const current = ensureUserSettings(userId);
  const nextPreferred =
    patch.preferredWallColor === undefined
      ? current.preferredWallColor
      : patch.preferredWallColor === null
        ? null
        : isWallColor(patch.preferredWallColor)
          ? patch.preferredWallColor
          : current.preferredWallColor;
  const nextTimezone =
    patch.timezone === undefined ? current.timezone : normalizeTimeZone(patch.timezone);
  const nextTimezoneSet = nextOnboardingTimezoneSet(current.onboardingTimezoneSet, {
    onboardingTimezoneSet: patch.onboardingTimezoneSet,
    timezone: patch.timezone,
  });
  const nextSeasonalFrame =
    patch.seasonalFrame === undefined ? current.seasonalFrame : patch.seasonalFrame;
  const nextFocusMinutes =
    patch.focusMinutes === undefined
      ? current.focusMinutes
      : storedFocusMinutes(patch.focusMinutes);
  const nextFocusChime =
    patch.focusChime === undefined ? current.focusChime : patch.focusChime;
  const nextNightMode = patch.nightMode === undefined ? current.nightMode : patch.nightMode;
  const nextMemoryLane =
    patch.memoryLane === undefined ? current.memoryLane : patch.memoryLane;

  getDb()
    .prepare(
      `UPDATE user_settings
       SET onboarding_dismissed = @onboarding_dismissed,
           onboarding_history_seen = @onboarding_history_seen,
           onboarding_wall_seen = @onboarding_wall_seen,
           onboarding_timezone_set = @onboarding_timezone_set,
           reminder_enabled = @reminder_enabled,
           reminder_weekday = @reminder_weekday,
           reminder_last_sent_at = @reminder_last_sent_at,
           custom_questions = @custom_questions,
           preferred_wall_color = @preferred_wall_color,
           timezone = @timezone,
           seasonal_frame = @seasonal_frame,
           focus_minutes = @focus_minutes,
           focus_chime = @focus_chime,
           night_mode = @night_mode,
           memory_lane = @memory_lane
       WHERE user_id = @user_id`,
    )
    .run({
      user_id: userId,
      onboarding_dismissed:
        patch.onboardingDismissed === undefined
          ? current.onboardingDismissed
            ? 1
            : 0
          : patch.onboardingDismissed
            ? 1
            : 0,
      onboarding_history_seen:
        patch.onboardingHistorySeen === undefined
          ? current.onboardingHistorySeen
            ? 1
            : 0
          : patch.onboardingHistorySeen
            ? 1
            : 0,
      onboarding_wall_seen:
        patch.onboardingWallSeen === undefined
          ? current.onboardingWallSeen
            ? 1
            : 0
          : patch.onboardingWallSeen
            ? 1
            : 0,
      onboarding_timezone_set: nextTimezoneSet ? 1 : 0,
      reminder_enabled:
        patch.reminderEnabled === undefined
          ? current.reminderEnabled
            ? 1
            : 0
          : patch.reminderEnabled
            ? 1
            : 0,
      reminder_weekday:
        patch.reminderWeekday === undefined
          ? current.reminderWeekday
          : clampWeekday(patch.reminderWeekday),
      reminder_last_sent_at:
        patch.reminderLastSentAt === undefined
          ? current.reminderLastSentAt
          : patch.reminderLastSentAt,
      custom_questions: JSON.stringify(
        patch.customQuestions === undefined
          ? current.customQuestions
          : normalizeCustomQuestions(patch.customQuestions),
      ),
      preferred_wall_color: nextPreferred,
      timezone: nextTimezone,
      seasonal_frame: nextSeasonalFrame ? 1 : 0,
      focus_minutes: nextFocusMinutes,
      focus_chime: nextFocusChime ? 1 : 0,
      night_mode: nextNightMode ? 1 : 0,
      memory_lane: nextMemoryLane ? 1 : 0,
    });
  return ensureUserSettings(userId);
}

export type DueReminderUser = {
  userId: string;
  email: string;
};

export function listDueReminderUsers(now = new Date()): DueReminderUser[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS user_id, u.email,
              s.reminder_weekday, s.reminder_last_sent_at, s.timezone
       FROM user_settings s
       JOIN users u ON u.id = s.user_id
       WHERE s.reminder_enabled = 1`,
    )
    .all() as Array<{
    user_id: string;
    email: string;
    reminder_weekday: number;
    reminder_last_sent_at: string | null;
    timezone: string | null;
  }>;
  return rows
    .filter((row) =>
      reminderIsDue(
        {
          weekday: clampWeekday(row.reminder_weekday),
          lastSentAt: row.reminder_last_sent_at,
          timeZone: row.timezone,
        },
        now,
      ),
    )
    .map((row) => ({ userId: row.user_id, email: row.email }));
}

export function markReminderSent(userId: string, sentAt = new Date().toISOString()) {
  updateUserSettings(userId, { reminderLastSentAt: sentAt });
}
