export const ECHO_MAX_CHARS = 80;
export const ECHO_LIST_CAP = 24;
export const ECHO_WINDOW_MS = 60 * 60 * 1000;
export const ECHO_USER_MAX = 12;
export const ECHO_IP_MAX = 24;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export type EchoParse =
  | { ok: true; body: string }
  | { ok: false; error: "invalid" | "empty" | "too_long" };

/** One quiet line. Newlines fold into spaces; nothing longer than a breath. */
export function parseEchoBody(value: unknown): EchoParse {
  if (typeof value !== "string") return { ok: false, error: "invalid" };
  const oneLine = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!oneLine) return { ok: false, error: "empty" };
  if (CONTROL_CHARS.test(oneLine)) return { ok: false, error: "invalid" };
  if (Array.from(oneLine).length > ECHO_MAX_CHARS) return { ok: false, error: "too_long" };
  return { ok: true, body: oneLine };
}
