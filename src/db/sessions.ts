import { createHash } from "node:crypto";
import type { Database } from "better-sqlite3";
import type { OpenSessionSummary } from "@/lib/soft-sessions";
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

/**
 * Open sessions for one member: a count and the newest created_at.
 * Session ids stay in the table. A missing table returns null.
 */
export function readOpenSessionSummary(
  db: Database,
  userId: string,
  now: Date,
): OpenSessionSummary | null {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'`)
    .get() as { name?: string } | undefined;
  if (!table?.name) return null;

  const columns = db.prepare(`PRAGMA table_info(sessions)`).all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("user_id") || !names.has("expires_at") || !names.has("created_at")) {
    return null;
  }

  const rows = db
    .prepare(
      `SELECT created_at AS createdAt, expires_at AS expiresAt
       FROM sessions
       WHERE user_id = ?`,
    )
    .all(userId) as Array<{ createdAt: string; expiresAt: string }>;

  const nowMs = now.getTime();
  const open = rows.filter((row) => {
    const expires = Date.parse(row.expiresAt);
    return Number.isFinite(expires) && expires > nowMs;
  });
  if (open.length === 0) return { count: 0, newestCreatedAt: null };

  let newest = open[0]!;
  for (const row of open) {
    const created = Date.parse(row.createdAt);
    const best = Date.parse(newest.createdAt);
    if (Number.isNaN(best) || created > best) newest = row;
  }
  return { count: open.length, newestCreatedAt: newest.createdAt };
}

export function summarizeOpenSessions(userId: string, now = new Date()) {
  return readOpenSessionSummary(getDb(), userId, now);
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
