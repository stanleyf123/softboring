import { createHash } from "node:crypto";
import { getDb } from "./client";
import { toPublicUser, type PublicUser } from "./users";

type SessionJoinRow = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  plan: string;
  plan_status: string | null;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  nickname: string | null;
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(input: {
  id: string;
  userId: string;
  expiresAt: string;
}) {
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at)
       VALUES (@id, @user_id, @expires_at, @created_at)`,
    )
    .run({
      id: input.id,
      user_id: input.userId,
      expires_at: input.expiresAt,
      created_at: createdAt,
    });
}

export function deleteSession(tokenHash: string) {
  getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(tokenHash);
}

export function getUserBySessionToken(token: string): PublicUser | null {
  const tokenHash = hashSessionToken(token);
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.plan, u.plan_status, u.plan_expires_at,
              u.stripe_customer_id, u.stripe_subscription_id, u.nickname, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(tokenHash) as SessionJoinRow | undefined;

  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    deleteSession(tokenHash);
    return null;
  }
  return toPublicUser(row);
}
