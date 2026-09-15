import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./client";

const RESET_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken() {
  return randomBytes(32).toString("hex");
}

export function createPasswordResetToken(userId: string) {
  const db = getDb();
  const token = newResetToken();
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS).toISOString();

  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(userId);
  db.prepare(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(tokenHash, userId, expiresAt, now.toISOString());

  return { token, expiresAt };
}

export function getValidPasswordReset(token: string) {
  const tokenHash = hashResetToken(token);
  const row = getDb()
    .prepare(
      `SELECT token_hash, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?`,
    )
    .get(tokenHash) as
    | {
        token_hash: string;
        user_id: string;
        expires_at: string;
        used_at: string | null;
      }
    | undefined;

  if (!row || row.used_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export function consumePasswordResetToken(tokenHash: string) {
  getDb()
    .prepare(
      `UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL`,
    )
    .run(new Date().toISOString(), tokenHash);
}

export function updateUserPasswordHash(userId: string, passwordHash: string) {
  return getDb()
    .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
    .run(passwordHash, userId).changes;
}

export function deleteSessionsForUser(userId: string) {
  getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}
