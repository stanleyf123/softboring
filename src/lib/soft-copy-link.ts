import { inviteRegisterPath, normalizeInviteCode } from "@/lib/invite";
import { normalizeAppLocale, rewriteLocalePath } from "@/lib/locale-path";

/** Review and wall-note ids are UUIDs. Anything else is not a share target. */
const SHARE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COPY_TOAST_MS = 2400;

export type SoftShareKind = "postcard" | "wall-note" | "invite";

export function isShareId(value: unknown): value is string {
  return typeof value === "string" && SHARE_ID_RE.test(value);
}

export function postcardSharePath(locale: string, reviewId: string): string | null {
  const loc = normalizeAppLocale(locale);
  if (!loc || !isShareId(reviewId)) return null;
  return `/${loc}/history/${reviewId}`;
}

export function digestSharePath(locale: string): string | null {
  const loc = normalizeAppLocale(locale);
  if (!loc) return null;
  return `/${loc}/digest`;
}

export function wallNoteSharePath(locale: string, noteId: string): string | null {
  const loc = normalizeAppLocale(locale);
  if (!loc || !isShareId(noteId)) return null;
  return `/${loc}/wall?note=${encodeURIComponent(noteId)}`;
}

/** The invite door. `/invite/:code` redirects onward; the register URL is the one we hand over. */
export function inviteSharePath(locale: string, code: string): string | null {
  const loc = normalizeAppLocale(locale);
  const invite = normalizeInviteCode(code);
  if (!loc || !invite) return null;
  return inviteRegisterPath(loc, invite);
}

/**
 * Absolute http(s) URL, or a same-origin path joined to `origin`.
 * Locale prefixes are rewritten so a path never keeps `zh-TW`.
 */
export function resolveShareHref(input: {
  href?: string | null;
  path?: string | null;
  origin?: string | null;
}): string | null {
  const direct = input.href?.trim();
  if (direct) {
    try {
      const url = new URL(direct);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      const normalized = normalizeSharePath(`${url.pathname}${url.search}${url.hash}`);
      if (!normalized) return null;
      return `${url.origin}${normalized}`;
    } catch {
      return null;
    }
  }

  const path = input.path?.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  const normalized = normalizeSharePath(path);
  if (!normalized) return null;
  const origin = (input.origin ?? "").trim().replace(/\/+$/, "");
  if (!origin) return normalized;
  try {
    const base = new URL(origin);
    if (base.protocol !== "http:" && base.protocol !== "https:") return normalized;
    return `${base.origin}${normalized}`;
  } catch {
    return normalized;
  }
}

export function normalizeSharePath(pathname: string): string | null {
  const raw = pathname.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  const hashAt = raw.indexOf("#");
  const beforeHash = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const queryAt = beforeHash.indexOf("?");
  const pathOnly = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const head = pathOnly.split("/")[1] ?? "";
  const locale = normalizeAppLocale(head);
  if (!locale) return null;
  return rewriteLocalePath(raw, locale);
}

/** Keep or clear `?note=` without dropping the rest of the wall query. */
export function withWallNoteQuery(href: string, noteId: string | null): string {
  let url: URL;
  try {
    url = new URL(href, "https://app.local");
  } catch {
    return href;
  }
  if (noteId && isShareId(noteId)) url.searchParams.set("note", noteId);
  else url.searchParams.delete("note");
  const next = `${url.pathname}${url.search}${url.hash}`;
  return normalizeSharePath(next) ?? next;
}

export async function copyShareText(
  text: string,
  clipboard?: { writeText?: (value: string) => Promise<void> } | null,
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const writeText = clipboard?.writeText;
  if (!writeText) return false;
  try {
    await writeText(trimmed);
    return true;
  } catch {
    return false;
  }
}
