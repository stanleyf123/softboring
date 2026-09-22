import { getDb } from "./client";
import {
  normalizeCustomQuestions,
  parseCustomQuestionsJson,
  type CustomQuestion,
} from "@/lib/custom-questions";
import { isWallColor, type WallColor } from "@/lib/wall-canvas";

export type UserSettings = {
  userId: string;
  onboardingDismissed: boolean;
  onboardingHistorySeen: boolean;
  onboardingWallSeen: boolean;
  reminderEnabled: boolean;
  reminderWeekday: number;
  reminderLastSentAt: string | null;
  customQuestions: CustomQuestion[];
  preferredWallColor: WallColor | null;
};

type SettingsRow = {
  user_id: string;
  onboarding_dismissed: number;
  onboarding_history_seen: number;
  onboarding_wall_seen: number;
  reminder_enabled: number;
  reminder_weekday: number;
  reminder_last_sent_at: string | null;
  custom_questions: string | null;
  preferred_wall_color: string | null;
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
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderWeekday: clampWeekday(row.reminder_weekday),
    reminderLastSentAt: row.reminder_last_sent_at,
    customQuestions: parseCustomQuestionsJson(row.custom_questions),
    preferredWallColor: parsePreferredWallColor(row.preferred_wall_color),
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
  reminderEnabled?: boolean;
  reminderWeekday?: number;
  reminderLastSentAt?: string | null;
  customQuestions?: CustomQuestion[];
  preferredWallColor?: WallColor | null;
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

  getDb()
    .prepare(
      `UPDATE user_settings
       SET onboarding_dismissed = @onboarding_dismissed,
           onboarding_history_seen = @onboarding_history_seen,
           onboarding_wall_seen = @onboarding_wall_seen,
           reminder_enabled = @reminder_enabled,
           reminder_weekday = @reminder_weekday,
           reminder_last_sent_at = @reminder_last_sent_at,
           custom_questions = @custom_questions,
           preferred_wall_color = @preferred_wall_color
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
    });
  return ensureUserSettings(userId);
}

export type DueReminderUser = {
  userId: string;
  email: string;
};

export function listDueReminderUsers(now = new Date()): DueReminderUser[] {
  const weekday = now.getDay();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const rows = getDb()
    .prepare(
      `SELECT u.id AS user_id, u.email
       FROM user_settings s
       JOIN users u ON u.id = s.user_id
       WHERE s.reminder_enabled = 1
         AND s.reminder_weekday = ?
         AND (s.reminder_last_sent_at IS NULL OR datetime(s.reminder_last_sent_at) < datetime(?))`,
    )
    .all(weekday, todayIso) as Array<{ user_id: string; email: string }>;
  return rows.map((row) => ({ userId: row.user_id, email: row.email }));
}

export function markReminderSent(userId: string, sentAt = new Date().toISOString()) {
  updateUserSettings(userId, { reminderLastSentAt: sentAt });
}
