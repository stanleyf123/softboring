import { NextResponse } from "next/server";
import {
  isOAuthProvider,
  isOAuthProviderConfigured,
} from "@/lib/oauth-config";
import {
  googleAuthorizeUrl,
  lineAuthorizeUrl,
  localeFromReferer,
  newOAuthState,
  oauthCookieOptions,
  oauthErrorRedirectUrl,
  oauthRedirectUri,
  parseOAuthLocale,
  pkceChallenge,
  signOAuthState,
  OAUTH_STATE_COOKIE,
} from "@/lib/oauth";
import { enforceAuthRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: Request, context: Context) {
  const { provider: rawProvider } = await context.params;
  const url = new URL(request.url);
  const locale = parseOAuthLocale(
    url.searchParams.get("locale") ?? localeFromReferer(request.headers.get("referer")),
  );
  const returnTo = url.searchParams.get("next") ?? url.searchParams.get("returnTo");
  const invite = url.searchParams.get("invite");

  if (!isOAuthProvider(rawProvider)) {
    return NextResponse.redirect(oauthErrorRedirectUrl(request.url, locale, "oauth_failed", returnTo));
  }

  const limited = enforceAuthRateLimit(request, "oauth");
  if (limited) {
    return NextResponse.redirect(
      oauthErrorRedirectUrl(request.url, locale, "rate_limited", returnTo),
    );
  }

  if (!isOAuthProviderConfigured(rawProvider)) {
    return NextResponse.redirect(
      oauthErrorRedirectUrl(request.url, locale, "oauth_disabled", returnTo),
    );
  }

  const payload = newOAuthState({
    provider: rawProvider,
    returnTo,
    locale,
    invite,
  });
  const redirectUri = oauthRedirectUri(rawProvider, request.url);
  const challenge = pkceChallenge(payload.verifier);

  const googleId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const lineId = process.env.LINE_CHANNEL_ID?.trim() ?? "";
  const authorize =
    rawProvider === "google"
      ? googleAuthorizeUrl({
          clientId: googleId,
          redirectUri,
          state: payload.state,
          nonce: payload.nonce,
          challenge,
        })
      : lineAuthorizeUrl({
          channelId: lineId,
          redirectUri,
          state: payload.state,
          nonce: payload.nonce,
          challenge,
        });

  const response = NextResponse.redirect(authorize);
  response.cookies.set(OAUTH_STATE_COOKIE, signOAuthState(payload), oauthCookieOptions());
  return response;
}
