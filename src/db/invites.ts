import { getDb } from "./client";
import { newInviteCode, normalizeInviteCode } from "@/lib/invite";

export type InviteCodeRow = {
  code: string;
  createdAt: string;
};

export function getInviteCodeForUser(userId: string): InviteCodeRow | null {
  const row = getDb()
    .prepare(`SELECT code, created_at FROM invite_codes WHERE inviter_id = ?`)
    .get(userId) as { code: string; created_at: string } | undefined;
  return row ? { code: row.code, createdAt: row.created_at } : null;
}

export function getOrCreateInviteCode(userId: string): InviteCodeRow {
  const existing = getInviteCodeForUser(userId);
  if (existing) return existing;

  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = newInviteCode();
    const createdAt = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO invite_codes (code, inviter_id, created_at) VALUES (?, ?, ?)`,
      ).run(code, userId, createdAt);
      return { code, createdAt };
    } catch (error) {
      const sqliteCode = (error as { code?: string }).code;
      if (sqliteCode !== "SQLITE_CONSTRAINT_UNIQUE" && sqliteCode !== "SQLITE_CONSTRAINT") {
        throw error;
      }
      const again = getInviteCodeForUser(userId);
      if (again) return again;
    }
  }
  throw new Error("invite_code_failed");
}

export function countRedeemedInvites(inviterId: string) {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM invites WHERE inviter_id = ?`)
    .get(inviterId) as { n: number };
  return row.n;
}

export function joinedViaInvite(userId: string) {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM invites WHERE invitee_id = ?`)
    .get(userId) as { ok: number } | undefined;
  return Boolean(row);
}

/**
 * Attribute a brand-new account to an inviter.
 * `created_at` is when the personal code was made; `redeemed_at` is signup.
 * Returns false for unknown, self, or already-redeemed codes without throwing.
 */
export function redeemInviteCode(input: { code: string; inviteeId: string }): boolean {
  const code = normalizeInviteCode(input.code);
  if (!code || !input.inviteeId) return false;

  const db = getDb();
  const invite = db
    .prepare(`SELECT inviter_id, created_at FROM invite_codes WHERE code = ?`)
    .get(code) as { inviter_id: string; created_at: string } | undefined;
  if (!invite || invite.inviter_id === input.inviteeId) return false;

  try {
    const changes = db
      .prepare(
        `INSERT INTO invites (id, inviter_id, invitee_id, created_at, redeemed_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        invite.inviter_id,
        input.inviteeId,
        invite.created_at,
        new Date().toISOString(),
      ).changes;
    return changes > 0;
  } catch (error) {
    const sqliteCode = (error as { code?: string }).code;
    if (sqliteCode === "SQLITE_CONSTRAINT_UNIQUE" || sqliteCode === "SQLITE_CONSTRAINT") {
      return false;
    }
    throw error;
  }
}
