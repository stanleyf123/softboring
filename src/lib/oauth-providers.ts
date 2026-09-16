import type { OAuthIdentity } from "@/db/oauth";
import type { OAuthProvider } from "@/lib/oauth-config";

const FETCH_MS = 12_000;

async function postForm(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(FETCH_MS),
    cache: "no-store",
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  return { ok: response.ok, status: response.status, json };
}

async function getJson(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_MS),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, json };
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function emailVerifiedFlag(value: unknown) {
  return value === true || value === "true" || value === "1";
}

export async function exchangeGoogleIdentity(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  verifier: string;
  nonce: string;
}): Promise<OAuthIdentity> {
  const token = await postForm("https://oauth2.googleapis.com/token", {
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  });
  const idToken = asString(token.json.id_token);
  if (!token.ok || !idToken) {
    throw new Error("google_token_failed");
  }

  const info = await getJson(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!info.ok) throw new Error("google_tokeninfo_failed");

  const aud = asString(info.json.aud);
  const iss = asString(info.json.iss);
  const sub = asString(info.json.sub);
  const nonce = asString(info.json.nonce);
  if (aud !== input.clientId) throw new Error("google_aud_mismatch");
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw new Error("google_iss_mismatch");
  }
  if (!sub) throw new Error("google_missing_sub");
  if (nonce !== input.nonce) throw new Error("google_nonce_mismatch");

  const email = asString(info.json.email);
  const verified = emailVerifiedFlag(info.json.email_verified);

  return {
    provider: "google",
    providerUserId: sub,
    email,
    emailVerified: Boolean(email && verified),
  };
}

export async function exchangeLineIdentity(input: {
  code: string;
  redirectUri: string;
  channelId: string;
  channelSecret: string;
  verifier: string;
  nonce: string;
}): Promise<OAuthIdentity> {
  const token = await postForm("https://api.line.me/oauth2/v2.1/token", {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.channelId,
    client_secret: input.channelSecret,
    code_verifier: input.verifier,
  });
  const idToken = asString(token.json.id_token);
  if (!token.ok || !idToken) {
    throw new Error("line_token_failed");
  }

  const verified = await postForm("https://api.line.me/oauth2/v2.1/verify", {
    id_token: idToken,
    client_id: input.channelId,
  });
  if (!verified.ok) throw new Error("line_verify_failed");

  const iss = asString(verified.json.iss);
  const sub = asString(verified.json.sub);
  const nonce = asString(verified.json.nonce);
  if (iss !== "https://access.line.me") throw new Error("line_iss_mismatch");
  if (!sub) throw new Error("line_missing_sub");
  if (nonce !== input.nonce) throw new Error("line_nonce_mismatch");

  const email = asString(verified.json.email);

  return {
    provider: "line",
    providerUserId: sub,
    email,
    // LINE only includes email when the user granted it on a verified address.
    emailVerified: Boolean(email),
  };
}

export async function exchangeOAuthIdentity(
  provider: OAuthProvider,
  input: {
    code: string;
    redirectUri: string;
    verifier: string;
    nonce: string;
  },
): Promise<OAuthIdentity> {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
    return exchangeGoogleIdentity({
      ...input,
      clientId,
      clientSecret,
    });
  }
  const channelId = process.env.LINE_CHANNEL_ID?.trim() || "";
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim() || "";
  return exchangeLineIdentity({
    ...input,
    channelId,
    channelSecret,
  });
}
