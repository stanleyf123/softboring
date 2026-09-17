export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;
export const NICKNAME_LOCAL_MAX = 12;

export class NicknameError extends Error {
  readonly code: "invalid_nickname" | "nickname_too_short" | "nickname_too_long";

  constructor(code: NicknameError["code"], message: string) {
    super(message);
    this.name = "NicknameError";
    this.code = code;
  }
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function nicknameLength(value: string) {
  return Array.from(value).length;
}

export function storedNickname(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseNickname(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new NicknameError("invalid_nickname", "That nickname is not quite right.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CONTROL_CHARS.test(trimmed)) {
    throw new NicknameError("invalid_nickname", "That nickname is not quite right.");
  }
  const length = nicknameLength(trimmed);
  if (length < NICKNAME_MIN) {
    throw new NicknameError(
      "nickname_too_short",
      "A little longer — at least 2 characters.",
    );
  }
  if (length > NICKNAME_MAX) {
    throw new NicknameError(
      "nickname_too_long",
      "Keep it short — 16 characters or fewer.",
    );
  }
  return trimmed;
}

function isSyntheticOAuthEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@oauth.softboring.invalid");
}

export function emailLocalFallback(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed || isSyntheticOAuthEmail(trimmed)) return null;
  const local = trimmed.split("@")[0]?.trim() ?? "";
  if (!local) return null;
  const chars = Array.from(local);
  if (chars.length <= NICKNAME_LOCAL_MAX) return local;
  return `${chars.slice(0, NICKNAME_LOCAL_MAX).join("")}…`;
}

/**
 * Public wall attribution. Nickname is the intended public identity.
 * Soft+ notes may fall back to a truncated email local-part; teasers should
 * pass `allowEmailFallback: false` so blurred notes do not leak emails.
 */
export function wallOwnerNickname(
  nickname: string | null | undefined,
  email: string | null | undefined,
  options: { allowEmailFallback?: boolean } = {},
): string | null {
  const nick = storedNickname(nickname);
  if (nick) return nick;
  if (options.allowEmailFallback === false) return null;
  return emailLocalFallback(email);
}
