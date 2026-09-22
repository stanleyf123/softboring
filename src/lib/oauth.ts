import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hasLocale } from "next-intl";
import {
  isOAuthProvider,
  oauthCallbackPath,
  type OAuthProvider,
} from "@/lib/oauth-config";
import { normalizeInviteCode } from "@/lib/invite";
import { publicAbsoluteUrl, publicOrigin, safeAppPath } from "@/lib/public-origin";
import { routing, type AppLocale } from "@/i18n/routing";

export const OAUTH_STATE_COOKIE = "softboring_oauth";
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type OAuthStatePayload = {
  state: string;
  nonce: string;
  verifier: string;
  provider: OAuthProvider;
  returnTo: string;
  locale: AppLocale;
  invite: string | null;
  exp: number;
};

function stateSecret() {
  const material = [
    "softboring-oauth-v1",
    process.env.GOOGLE_CLIENT_SECRET ?? "",
    process.env.LINE_CHANNEL_SECRET ?? "",
    process.env.SITE_URL ?? "",
  ].join("|");
  return createHash("sha256").update(material).digest();
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export function signOAuthState(payload: OAuthStatePayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOAuthState(raw: string | undefined | null): OAuthStatePayload | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<OAuthStatePayload>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.verifier !== "string" ||
      typeof parsed.provider !== "string" ||
      !isOAuthProvider(parsed.provider) ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.locale !== "string" ||
      !hasLocale(routing.locales, parsed.locale) ||
      (parsed.invite != null && typeof parsed.invite !== "string") ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp <= Date.now()) return null;
    return {
      ...(parsed as OAuthStatePayload),
      locale: parsed.locale,
      invite: typeof parsed.invite === "string" ? normalizeInviteCode(parsed.invite) : null,
    };
  } catch {
    return null;
  }
}

export function newPkceVerifier() {
  return randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function newOAuthState(input: {
  provider: OAuthProvider;
  returnTo?: string | null;
  locale?: string | null;
  invite?: string | null;
}): OAuthStatePayload {
  return {
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    verifier: newPkceVerifier(),
    provider: input.provider,
    returnTo: safeAppPath(input.returnTo, "/account"),
    locale: parseOAuthLocale(input.locale),
    invite: normalizeInviteCode(input.invite),
    exp: Date.now() + OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  };
}

export function parseOAuthLocale(value: string | null | undefined): AppLocale {
  if (value && hasLocale(routing.locales, value)) return value;
  return routing.defaultLocale;
}

export function localeFromReferer(referer: string | null | undefined): AppLocale | null {
  if (!referer) return null;
  try {
    const path = new URL(referer).pathname;
    for (const locale of routing.locales) {
      if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
        return locale;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function oauthRedirectUri(provider: OAuthProvider, requestUrl: string) {
  return publicAbsoluteUrl(oauthCallbackPath(provider), requestUrl).toString();
}

export function oauthSuccessPath(locale: AppLocale, returnTo: string) {
  const dest = safeAppPath(returnTo, "/account");
  if (dest === "/") return `/${locale}`;
  return `/${locale}${dest}`;
}

export function oauthErrorRedirectUrl(
  requestUrl: string,
  locale: AppLocale,
  error: string,
  returnTo?: string | null,
) {
  const dest = new URL(`/${locale}/login`, publicOrigin(requestUrl));
  dest.searchParams.set("error", error);
  if (returnTo) {
    dest.searchParams.set("next", safeAppPath(returnTo, "/account"));
  }
  return dest;
}

export function googleAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url;
}

export function lineAuthorizeUrl(input: {
  channelId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
}) {
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.channelId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "profile openid email");
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}
