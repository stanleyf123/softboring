import { getDb } from "./client";
import {
  clampActivityLimit,
  rowsToSoftActivity,
  SOFT_ACTIVITY_LIMIT,
  SOFT_ACTIVITY_SQL,
  type SoftActivityRow,
} from "../lib/soft-activity.ts";

export function listOwnSoftActivity(userId: string, limit = SOFT_ACTIVITY_LIMIT) {
  const cap = clampActivityLimit(limit);
  const rows = getDb()
    .prepare(SOFT_ACTIVITY_SQL)
    .all(userId, userId, userId, cap) as SoftActivityRow[];
  return rowsToSoftActivity(rows);
}
