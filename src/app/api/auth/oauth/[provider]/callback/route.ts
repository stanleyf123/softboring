import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redeemInviteCode } from "@/db/invites";
import { findOrLinkOAuthUser, OAuthLinkError } from "@/db/oauth";
import {
  claimGuestReviewsForUser,
  issueSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  isOAuthProvider,
  isOAuthProviderConfigured,
} from "@/lib/oauth-config";
import {
  localeFromReferer,
  oauthCookieOptions,
  oauthErrorRedirectUrl,
  oauthRedirectUri,
  parseOAuthLocale,
  readOAuthState,
  OAUTH_STATE_COOKIE,
} from "@/lib/oauth";
import { exchangeOAuthIdentity } from "@/lib/oauth-providers";
import { publicAbsoluteUrl } from "@/lib/public-origin";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { oauthPostAuthPath } from "@/lib/thanks-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ provider: string }>;
};

function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: Request, context: Context) {
  const { provider: rawProvider } = await context.params;
  const url = new URL(request.url);
  const store = await cookies();
  const payload = readOAuthState(store.get(OAUTH_STATE_COOKIE)?.value);
  const fallbackLocale = parseOAuthLocale(
    url.searchParams.get("locale") ?? localeFromReferer(request.headers.get("referer")),
  );
  const locale = payload?.locale ?? fallbackLocale;
  const returnTo = payload?.returnTo ?? url.searchParams.get("next");

  const fail = (error: string) =>
    clearOAuthCookie(
      NextResponse.redirect(oauthErrorRedirectUrl(request.url, locale, error, returnTo)),
    );

  if (!isOAuthProvider(rawProvider)) {
    return fail("oauth_failed");
  }

  const limited = enforceAuthRateLimit(request, "oauth");
  if (limited) return fail("rate_limited");

  if (!isOAuthProviderConfigured(rawProvider)) {
    return fail("oauth_disabled");
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    return fail(providerError === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !payload) {
    return fail("oauth_failed");
  }
  if (payload.provider !== rawProvider || payload.state !== state) {
    return fail("oauth_failed");
  }

  try {
    const identity = await exchangeOAuthIdentity(rawProvider, {
      code,
      redirectUri: oauthRedirectUri(rawProvider, request.url),
      verifier: payload.verifier,
      nonce: payload.nonce,
    });
    const { user, created } = findOrLinkOAuthUser(identity);
    const inviteRedeemed =
      created && payload.invite
        ? redeemInviteCode({ code: payload.invite, inviteeId: user.id })
        : false;
    const token = issueSession(user.id);
    await claimGuestReviewsForUser(user.id);

    const dest = publicAbsoluteUrl(
      oauthPostAuthPath(locale, payload.returnTo, created, inviteRedeemed),
      request.url,
    );
    const response = NextResponse.redirect(dest);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    clearOAuthCookie(response);
    return response;
  } catch (error) {
    if (error instanceof OAuthLinkError) {
      return fail("oauth_conflict");
    }
    console.error(`GET /api/auth/oauth/${rawProvider}/callback failed`, error);
    return fail("oauth_failed");
  }
}
