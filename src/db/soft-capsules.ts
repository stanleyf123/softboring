import { getDb } from "./client";
import { ensureUserSettings } from "./user-settings";
import {
  CAPSULE_CAP,
  parseCapsuleBody,
  parseUnlockOn,
  sortPublicCapsules,
  toPublicCapsule,
  type PublicCapsule,
  type SoftCapsule,
} from "@/lib/soft-capsule";

export { CAPSULE_CAP, parseCapsuleBody, parseUnlockOn };

type CapsuleRow = {
  id: string;
  user_id: string;
  body: string;
  unlock_at: string;
  created_at: string;
};

function toCapsule(row: CapsuleRow): SoftCapsule {
  return {
    id: row.id,
    body: row.body,
    unlockAt: row.unlock_at,
    createdAt: row.created_at,
  };
}

export function countCapsules(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM soft_capsules WHERE user_id = ?`)
    .get(userId) as { n: number };
  return row.n;
}

export function listPublicCapsules(userId: string, now = new Date()): PublicCapsule[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, body, unlock_at, created_at
       FROM soft_capsules
       WHERE user_id = ?
       ORDER BY datetime(unlock_at) ASC, datetime(created_at) ASC`,
    )
    .all(userId) as CapsuleRow[];
  return sortPublicCapsules(rows.map((row) => toPublicCapsule(toCapsule(row), now)));
}

export type SealCapsuleResult =
  | { ok: true; capsule: PublicCapsule; count: number }
  | { ok: false; reason: "invalid" | "date" | "full" };

export function sealCapsule(
  userId: string,
  rawBody: unknown,
  unlockOn: unknown,
  now = new Date(),
): SealCapsuleResult {
  const body = parseCapsuleBody(rawBody);
  if (!body) return { ok: false, reason: "invalid" };
  const timeZone = ensureUserSettings(userId).timezone;
  const unlockAt = parseUnlockOn(unlockOn, now, timeZone);
  if (!unlockAt) return { ok: false, reason: "date" };
  if (countCapsules(userId) >= CAPSULE_CAP) return { ok: false, reason: "full" };

  const id = crypto.randomUUID();
  const createdAt = now.toISOString();
  getDb()
    .prepare(
      `INSERT INTO soft_capsules (id, user_id, body, unlock_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, body, unlockAt, createdAt);

  const capsule = toPublicCapsule({ id, body, unlockAt, createdAt }, now);
  return { ok: true, capsule, count: countCapsules(userId) };
}

export function deleteCapsule(userId: string, id: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM soft_capsules WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return result.changes > 0;
}
