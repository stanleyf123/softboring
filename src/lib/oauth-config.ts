export const OAUTH_PROVIDERS = ["google", "line"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const SYNTHETIC_EMAIL_DOMAIN = "oauth.softboring.invalid";

type EnvMap = Record<string, string | undefined>;

function readEnv(name: string, env: EnvMap = process.env) {
  return env[name]?.trim() || "";
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function isGoogleOAuthConfigured(env: EnvMap = process.env) {
  return Boolean(readEnv("GOOGLE_CLIENT_ID", env) && readEnv("GOOGLE_CLIENT_SECRET", env));
}

export function isLineOAuthConfigured(env: EnvMap = process.env) {
  return Boolean(readEnv("LINE_CHANNEL_ID", env) && readEnv("LINE_CHANNEL_SECRET", env));
}

export function isOAuthProviderConfigured(
  provider: OAuthProvider,
  env: EnvMap = process.env,
) {
  return provider === "google"
    ? isGoogleOAuthConfigured(env)
    : isLineOAuthConfigured(env);
}

export function oauthCallbackPath(provider: OAuthProvider) {
  return `/api/auth/oauth/${provider}/callback`;
}

export function oauthStartPath(provider: OAuthProvider) {
  return `/api/auth/oauth/${provider}`;
}

export function syntheticOAuthEmail(provider: OAuthProvider, providerUserId: string) {
  const id = providerUserId.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "user";
  return `${provider}.${id}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticOAuthEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

export function oauthIdentityLabel(email: string): "google" | "line" | null {
  if (!isSyntheticOAuthEmail(email)) return null;
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  if (local.startsWith("google.")) return "google";
  if (local.startsWith("line.")) return "line";
  return null;
}
