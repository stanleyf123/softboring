import { routing, type AppLocale } from "@/i18n/routing";
import { safeAppPath } from "@/lib/public-origin";
import { hasLocale } from "next-intl";

export const WELCOME_PATH = "/welcome";
export const PLUS_THANKS_PATH = "/thanks/plus";
export const THANKS_PATH = "/thanks";

function withNextQuery(path: string, next: string) {
  const params = new URLSearchParams();
  params.set("next", next);
  return `${path}?${params.toString()}`;
}

/** Where email registration should land. Optional `next` is preserved as a continue link. */
export function registerSuccessPath(nextPath?: string | null) {
  const next = safeAppPath(nextPath, WELCOME_PATH);
  if (next === WELCOME_PATH || next === "/account" || next === "/") {
    return WELCOME_PATH;
  }
  return withNextQuery(WELCOME_PATH, next);
}

export function withInvitedFlag(path: string) {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("invited", "1");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Existing OAuth members keep `returnTo`. First-time OAuth lands on welcome. */
export function oauthPostAuthPath(
  locale: AppLocale,
  returnTo: string | null | undefined,
  created: boolean,
  invited = false,
) {
  const safeLocale: AppLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
  if (!created) {
    const dest = safeAppPath(returnTo, "/account");
    if (dest === "/") return `/${safeLocale}`;
    return `/${safeLocale}${dest}`;
  }

  const dest = safeAppPath(returnTo, WELCOME_PATH);
  const path =
    dest === WELCOME_PATH || dest === "/account" || dest === "/"
      ? `/${safeLocale}${WELCOME_PATH}`
      : `/${safeLocale}${withNextQuery(WELCOME_PATH, dest)}`;
  return invited ? withInvitedFlag(path) : path;
}
