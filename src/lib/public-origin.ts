import { routing } from "@/i18n/routing";

/**
 * Public site origin for absolute redirects.
 *
 * Behind nginx → 127.0.0.1:3001, Next.js `request.url` is the upstream
 * address even when nginx forwards Host / X-Forwarded-*. Prefer SITE_URL
 * (trailing slash stripped) whenever it is set.
 */
export function publicOrigin(requestUrl: string, siteUrl = process.env.SITE_URL): string {
  const configured = (siteUrl ?? "").trim().replace(/\/+$/, "");
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Invalid SITE_URL — fall back to the inbound request origin.
    }
  }
  return new URL(requestUrl).origin;
}

export function publicAbsoluteUrl(
  path: string,
  requestUrl: string,
  siteUrl = process.env.SITE_URL,
): URL {
  return new URL(path, publicOrigin(requestUrl, siteUrl));
}

export function safeAppPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/admin")) return fallback;

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://app.local") return fallback;

  let pathname = url.pathname;
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) {
      pathname = "/";
      break;
    }
    if (pathname.startsWith(`/${locale}/`)) {
      pathname = pathname.slice(locale.length + 1);
      break;
    }
  }
  if (pathname.startsWith("/admin")) return fallback;
  return `${pathname}${url.search}` || fallback;
}

export function safeAdminPath(value: string | null | undefined, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://app.local") return fallback;
  if (!url.pathname.startsWith("/admin")) return fallback;
  if (url.pathname === "/admin/login") return fallback;
  return `${url.pathname}${url.search}`;
}
