import { randomBytes } from "node:crypto";

/** Same readable alphabet as friend invites (no i, l, o, 0, or 1). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 12;
const CODE_RE = /^[a-hjkmnp-z2-9]{12}$/;

export function newGiftCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

export function normalizeGiftCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase().replace(/[\s-]+/g, "");
  if (!CODE_RE.test(code)) return null;
  return code;
}

export function giftExpiresAt(days: number, from = new Date()) {
  const expires = new Date(from.getTime());
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}
