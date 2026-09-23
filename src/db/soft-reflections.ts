import { getDb } from "./client";
import { ensureUserSettings } from "./user-settings";
import {
  emptySoftReflection,
  reflectionFlag,
  reflectionWeekKey,
  type SoftReflectionChecks,
} from "@/lib/soft-reflection";

export type SoftWeekReflection = {
  weekKey: string;
  checks: SoftReflectionChecks;
  updatedAt: string;
};

type ReflectionRow = {
  week_key: string;
  noticed: number;
  unfinished: number;
  kind: number;
  updated_at: string;
};

function toReflection(row: ReflectionRow): SoftWeekReflection {
  return {
    weekKey: row.week_key,
    checks: {
      noticed: row.noticed === 1,
      unfinished: row.unfinished === 1,
      kind: row.kind === 1,
    },
    updatedAt: row.updated_at,
  };
}

export function currentReflectionWeekKey(userId: string, now = new Date()) {
  return reflectionWeekKey(now, ensureUserSettings(userId).timezone);
}

/** Newest ISO week first. Used by the Soft+ weekly JSON download. */
export function listSoftReflectionsForUser(userId: string): SoftWeekReflection[] {
  const rows = getDb()
    .prepare(
      `SELECT week_key, noticed, unfinished, kind, updated_at
       FROM soft_week_reflections
       WHERE user_id = ?
       ORDER BY week_key DESC, updated_at DESC`,
    )
    .all(userId) as ReflectionRow[];
  return rows.map(toReflection);
}

export function getSoftReflectionForWeek(
  userId: string,
  weekKey: string,
): SoftWeekReflection | null {
  const row = getDb()
    .prepare(
      `SELECT week_key, noticed, unfinished, kind, updated_at
       FROM soft_week_reflections
       WHERE user_id = ? AND week_key = ?`,
    )
    .get(userId, weekKey) as ReflectionRow | undefined;
  return row ? toReflection(row) : null;
}

/** Upsert the three marks for one ISO week. Other weeks stay untouched. */
export function saveSoftReflectionForWeek(input: {
  userId: string;
  weekKey: string;
  checks: SoftReflectionChecks;
  now?: Date;
}): SoftWeekReflection {
  const now = (input.now ?? new Date()).toISOString();
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO soft_week_reflections (
         id, user_id, week_key, noticed, unfinished, kind, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, week_key) DO UPDATE SET
         noticed = excluded.noticed,
         unfinished = excluded.unfinished,
         kind = excluded.kind,
         updated_at = excluded.updated_at`,
    )
    .run(
      id,
      input.userId,
      input.weekKey,
      reflectionFlag(input.checks.noticed),
      reflectionFlag(input.checks.unfinished),
      reflectionFlag(input.checks.kind),
      now,
      now,
    );

  return (
    getSoftReflectionForWeek(input.userId, input.weekKey) ?? {
      weekKey: input.weekKey,
      checks: emptySoftReflection(),
      updatedAt: now,
    }
  );
}
