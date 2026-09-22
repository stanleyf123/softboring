import { routing, type AppLocale } from "@/i18n/routing";

const APP_LOCALES = new Set<string>(routing.locales);

/** URL locales are the lowercase ids `en`, `zh-tw`, and `ja`. `zh-TW` is not a path. */
export function normalizeAppLocale(value: string): AppLocale | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "zh-tw") return "zh-tw";
  if (APP_LOCALES.has(lowered)) return lowered as AppLocale;
  return null;
}

function splitPath(input: string) {
  const raw = input.trim() || "/";
  const hashAt = raw.indexOf("#");
  const hash = hashAt >= 0 ? raw.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const queryAt = beforeHash.indexOf("?");
  const query = queryAt >= 0 ? beforeHash.slice(queryAt) : "";
  const path = (queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash) || "/";
  return { path, query, hash };
}

/**
 * Rewrite a pathname onto another locale prefix.
 * Accepts paths with or without a locale, including a mistaken `/zh-TW` segment.
 * The returned path always starts with `/en`, `/zh-tw`, or `/ja`.
 */
export function rewriteLocalePath(pathname: string, locale: AppLocale): string {
  const target = normalizeAppLocale(locale);
  if (!target) {
    throw new Error("unsupported locale");
  }

  const { path, query, hash } = splitPath(pathname);
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const segments = withSlash.split("/");
  const head = segments[1] ?? "";
  const headLocale = normalizeAppLocale(head);
  const rest = headLocale ? segments.slice(2) : segments.slice(1);
  const suffix = rest.filter((part) => part.length > 0).join("/");
  const next = suffix ? `/${target}/${suffix}` : `/${target}`;
  return `${next}${query}${hash}`;
}
