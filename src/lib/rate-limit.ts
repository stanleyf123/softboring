import { getDb } from "@/db/client";
import { clientIp } from "@/lib/client-ip";
import { NextResponse } from "next/server";

export type AuthRateAction = "login" | "register" | "forgot-password";

export const AUTH_RATE_WINDOWS: Record<
  AuthRateAction,
  { windowMs: number; ipMax: number; emailMax: number }
> = {
  login: { windowMs: 15 * 60 * 1000, ipMax: 10, emailMax: 8 },
  register: { windowMs: 60 * 60 * 1000, ipMax: 5, emailMax: 5 },
  "forgot-password": { windowMs: 60 * 60 * 1000, ipMax: 5, emailMax: 3 },
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

function pruneOldWindows(now: number) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  getDb().prepare(`DELETE FROM rate_limits WHERE window_start < ?`).run(cutoff);
}

function hitKey(key: string, max: number, windowMs: number, now: number): RateLimitResult {
  const db = getDb();
  const row = db
    .prepare(`SELECT hits, window_start FROM rate_limits WHERE key = ?`)
    .get(key) as { hits: number; window_start: number } | undefined;

  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO rate_limits (key, hits, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET hits = 1, window_start = excluded.window_start`,
    ).run(key, now);
    return { ok: true };
  }

  if (row.hits >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000)),
    };
  }

  db.prepare(`UPDATE rate_limits SET hits = hits + 1 WHERE key = ?`).run(key);
  return { ok: true };
}

export function consumeAuthRateLimit(
  action: AuthRateAction,
  ip: string,
  email?: string | null,
): RateLimitResult {
  const cfg = AUTH_RATE_WINDOWS[action];
  const now = Date.now();
  if (Math.random() < 0.05) pruneOldWindows(now);

  const ipResult = hitKey(`${action}:ip:${ip || "unknown"}`, cfg.ipMax, cfg.windowMs, now);
  if (!ipResult.ok) return ipResult;

  const normalized = email?.trim().toLowerCase();
  if (!normalized) return { ok: true };

  return hitKey(`${action}:email:${normalized}`, cfg.emailMax, cfg.windowMs, now);
}

export function authRateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export function enforceAuthRateLimit(
  request: Request,
  action: AuthRateAction,
  email?: string | null,
) {
  const result = consumeAuthRateLimit(action, clientIp(request), email);
  if (result.ok) return null;
  return authRateLimitResponse(result.retryAfterSec);
}
