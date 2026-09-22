import { randomBytes } from "node:crypto";
import type { AppLocale } from "@/i18n/routing";

/** No i, l, o, 0, or 1 — easier to read aloud and paste. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 10;
const CODE_RE = /^[a-hjkmnp-z2-9]{10}$/;

export function newInviteCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  if (!CODE_RE.test(code)) return null;
  return code;
}

export function inviteRegisterPath(locale: AppLocale, code: string) {
  return `/${locale}/register?invite=${encodeURIComponent(code)}`;
}
