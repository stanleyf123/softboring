import { getDb } from "./client";
import { getUserById, updateUserBilling, type PublicUser } from "./users";
import { giftExpiresAt, newGiftCode, normalizeGiftCode } from "@/lib/gift-code";
import { isSoftPlusPlan, PLAN_SOFT_PLUS } from "@/lib/plan";

export type GiftCodeRow = {
  code: string;
  days: number | null;
  permanent: boolean;
  note: string | null;
  createdAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
  redeemedEmail: string | null;
};

type GiftCodeDbRow = {
  code: string;
  days: number | null;
  permanent: number;
  note: string | null;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  redeemed_email?: string | null;
};

function toGiftCode(row: GiftCodeDbRow): GiftCodeRow {
  return {
    code: row.code,
    days: row.days == null ? null : Number(row.days),
    permanent: Boolean(row.permanent),
    note: row.note?.trim() ? row.note.trim() : null,
    createdAt: row.created_at,
    redeemedAt: row.redeemed_at,
    redeemedBy: row.redeemed_by,
    redeemedEmail: row.redeemed_email?.trim() ? row.redeemed_email.trim() : null,
  };
}

export function listGiftCodes(limit = 100): GiftCodeRow[] {
  const rows = getDb()
    .prepare(
      `SELECT g.code, g.days, g.permanent, g.note, g.created_at, g.redeemed_at, g.redeemed_by,
              u.email AS redeemed_email
       FROM soft_plus_gift_codes g
       LEFT JOIN users u ON u.id = g.redeemed_by
       ORDER BY g.created_at DESC
       LIMIT ?`,
    )
    .all(Math.max(1, Math.min(limit, 500))) as GiftCodeDbRow[];
  return rows.map(toGiftCode);
}

export function countGiftCodes() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM soft_plus_gift_codes`)
    .get() as { n: number };
  return row.n;
}

export function countUnusedGiftCodes() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM soft_plus_gift_codes WHERE redeemed_at IS NULL`)
    .get() as { n: number };
  return row.n;
}

export type MintGiftCodeInput = {
  permanent?: boolean;
  days?: number | null;
  note?: string | null;
};

export function mintGiftCode(input: MintGiftCodeInput): GiftCodeRow {
  const permanent = input.permanent === true;
  const days = permanent ? null : Number(input.days);
  if (!permanent && (!Number.isInteger(days) || days! < 1 || days! > 3650)) {
    throw new Error("invalid_days");
  }
  const note = input.note?.trim() ? input.note.trim().slice(0, 200) : null;
  const db = getDb();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newGiftCode();
    const createdAt = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO soft_plus_gift_codes
           (code, days, permanent, note, created_at, redeemed_at, redeemed_by)
         VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
      ).run(code, days, permanent ? 1 : 0, note, createdAt);
      return {
        code,
        days,
        permanent,
        note,
        createdAt,
        redeemedAt: null,
        redeemedBy: null,
        redeemedEmail: null,
      };
    } catch (error) {
      const sqliteCode = (error as { code?: string }).code;
      if (sqliteCode !== "SQLITE_CONSTRAINT_UNIQUE" && sqliteCode !== "SQLITE_CONSTRAINT") {
        throw error;
      }
    }
  }
  throw new Error("gift_code_failed");
}

export type RedeemGiftResult =
  | { ok: true; user: PublicUser; permanent: boolean; days: number | null; expiresAt: string | null }
  | { ok: false; error: "invalid" | "already_used" | "already_plus" | "not_found" };

/**
 * One-time Soft+ gift for a signed-in Free member.
 * Permanent codes clear plan expiry; day codes set plan_expires_at.
 */
export function redeemGiftCode(input: {
  code: string;
  userId: string;
}): RedeemGiftResult {
  const code = normalizeGiftCode(input.code);
  if (!code || !input.userId) return { ok: false, error: "invalid" };

  const user = getUserById(input.userId);
  if (!user) return { ok: false, error: "invalid" };
  if (isSoftPlusPlan(user.plan, user.planStatus, user.planExpiresAt)) {
    return { ok: false, error: "already_plus" };
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT code, days, permanent, note, created_at, redeemed_at, redeemed_by
       FROM soft_plus_gift_codes WHERE code = ?`,
    )
    .get(code) as GiftCodeDbRow | undefined;
  if (!row) return { ok: false, error: "not_found" };
  if (row.redeemed_at || row.redeemed_by) return { ok: false, error: "already_used" };

  const permanent = Boolean(row.permanent);
  const days = permanent ? null : Number(row.days);
  if (!permanent && (!Number.isInteger(days) || days! < 1)) {
    return { ok: false, error: "invalid" };
  }

  const redeemedAt = new Date().toISOString();
  const expiresAt = permanent ? null : giftExpiresAt(days!);

  const run = db.transaction(() => {
    const claimed = db
      .prepare(
        `UPDATE soft_plus_gift_codes
         SET redeemed_at = ?, redeemed_by = ?
         WHERE code = ? AND redeemed_at IS NULL AND redeemed_by IS NULL`,
      )
      .run(redeemedAt, input.userId, code).changes;
    if (!claimed) return false;

    updateUserBilling(input.userId, {
      plan: PLAN_SOFT_PLUS,
      planStatus: "active",
      planExpiresAt: expiresAt,
    });
    return true;
  });

  if (!run()) return { ok: false, error: "already_used" };

  const next = getUserById(input.userId);
  if (!next) return { ok: false, error: "invalid" };
  return {
    ok: true,
    user: next,
    permanent,
    days,
    expiresAt,
  };
}
