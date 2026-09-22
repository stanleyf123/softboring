"use client";

import { GoogleMark, LineMark } from "@/components/oauth-marks";
import { Link, useRouter } from "@/i18n/navigation";
import { oauthStartPath, type OAuthProvider } from "@/lib/oauth-config";
import { safeAppPath } from "@/lib/public-origin";
import { registerSuccessPath, withInvitedFlag } from "@/lib/thanks-path";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { SoftMark } from "./soft-doodles";

type Mode = "login" | "register";

const ERROR_KEYS = [
  "invalid_credentials",
  "email_taken",
  "weak_password",
  "invalid_email",
  "rate_limited",
  "oauth_failed",
  "oauth_denied",
  "oauth_disabled",
  "oauth_conflict",
] as const;

type ErrorKey = (typeof ERROR_KEYS)[number];

function errorMessageKey(code: string | undefined): ErrorKey | "generic" {
  if (code && (ERROR_KEYS as readonly string[]).includes(code)) {
    return code as ErrorKey;
  }
  return "generic";
}

function authQuery(nextPath?: string | null, inviteCode?: string | null) {
  const query: Record<string, string> = {};
  if (nextPath) query.next = nextPath;
  if (inviteCode) query.invite = inviteCode;
  return Object.keys(query).length > 0 ? query : null;
}

export function AuthForm({
  mode,
  nextPath,
  inviteCode = null,
  oauth = { google: false, line: false },
  oauthError = null,
}: {
  mode: Mode;
  nextPath?: string | null;
  inviteCode?: string | null;
  oauth?: { google: boolean; line: boolean };
  oauthError?: string | null;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorKey | "generic" | null>(
    oauthError ? errorMessageKey(oauthError) : null,
  );

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
  const destination =
    mode === "register" ? registerSuccessPath(nextPath) : safeAppPath(nextPath, "/account");

  function oauthHref(provider: OAuthProvider) {
    const params = new URLSearchParams();
    params.set("locale", locale);
    if (nextPath) params.set("next", nextPath);
    if (inviteCode) params.set("invite", inviteCode);
    return `${oauthStartPath(provider)}?${params.toString()}`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" && inviteCode ? { invite: inviteCode } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        inviteRedeemed?: boolean;
      };
      if (!response.ok) {
        setError(response.status === 429 ? "rate_limited" : errorMessageKey(data.error));
        return;
      }
      const dest =
        mode === "register" && data.inviteRedeemed ? withInvitedFlag(destination) : destination;
      router.push(dest);
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  const oauthOff = !oauth.google || !oauth.line;

  const oauthBtn =
    "inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-line px-6 py-3";

  return (
    <div className="overflow-hidden rounded-[2rem] bg-paper shadow-card">
      <div className="flex items-center gap-3 bg-blush/70 px-6 py-4 sm:px-8">
        <SoftMark className="h-8 w-8" />
        <div>
          <p className="font-display text-lg tracking-tight">
            {mode === "login" ? t("cardLogin") : t("cardRegister")}
          </p>
          <p className="text-sm text-muted">
            {mode === "login" ? t("cardLoginNote") : t("cardRegisterNote")}
          </p>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-3">
          {oauth.google ? (
            <a
              href={oauthHref("google")}
              className={`${oauthBtn} bg-cream text-foreground shadow-soft hover:bg-blush/50`}
            >
              <GoogleMark />
              {t("continueGoogle")}
            </a>
          ) : (
            <span
              aria-disabled="true"
              className={`${oauthBtn} cursor-not-allowed bg-cream text-muted opacity-70`}
            >
              <GoogleMark />
              {t("continueGoogle")}
            </span>
          )}
          {oauth.line ? (
            <a
              href={oauthHref("line")}
              className={`${oauthBtn} bg-mint/80 text-foreground shadow-soft hover:bg-mint`}
            >
              <LineMark />
              {t("continueLine")}
            </a>
          ) : (
            <span
              aria-disabled="true"
              className={`${oauthBtn} cursor-not-allowed bg-mint/60 text-muted opacity-70`}
            >
              <LineMark />
              {t("continueLine")}
            </span>
          )}
        </div>
        {oauthOff && error !== "oauth_disabled" ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("oauthOff")}</p>
        ) : null}

        <div className="relative my-7">
          <div className="border-t border-line" />
          <p className="absolute inset-x-0 -top-2.5 text-center">
            <span className="bg-paper px-3 text-sm text-muted">{t("orEmail")}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-muted">{t("email")}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-full border border-line bg-background px-5 py-3 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="mt-5 block">
          <span className="text-sm text-muted">{t("password")}</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : undefined}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-full border border-line bg-background px-5 py-3 text-foreground outline-none focus:border-accent"
          />
        </label>
        {mode === "register" ? (
          <p className="mt-2 text-sm text-muted">{t("passwordHint")}</p>
        ) : (
          <p className="mt-3 text-sm">
            <Link href="/forgot-password" className="text-accent hover:text-foreground">
              {t("forgotLink")}
            </Link>
          </p>
        )}

        {error ? (
          <p className="mt-5 text-sm text-accent" role="alert">
            {error === "invalid_credentials"
              ? t("error.invalid_credentials")
              : error === "email_taken"
                ? t("error.email_taken")
                : error === "weak_password"
                  ? t("error.weak_password")
                  : error === "invalid_email"
                    ? t("error.invalid_email")
                    : error === "rate_limited"
                      ? t("error.rate_limited")
                      : error === "oauth_failed"
                        ? t("error.oauth_failed")
                        : error === "oauth_denied"
                          ? t("error.oauth_denied")
                          : error === "oauth_disabled"
                            ? t("error.oauth_disabled")
                            : error === "oauth_conflict"
                              ? t("error.oauth_conflict")
                              : t("error.generic")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 min-h-11 w-full rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
        >
          {submitting
            ? t("submitting")
            : t(mode === "login" ? "loginSubmit" : "registerSubmit")}
        </button>
        </form>

        {mode === "register" && inviteCode ? (
          <p className="mt-6 rounded-[1.25rem] bg-mint/70 px-4 py-3 text-sm leading-relaxed">
            {t("inviteHint")}
          </p>
        ) : null}

        <p className="mt-6 text-sm leading-relaxed text-muted">{t("guestHint")}</p>

        {mode === "login" ? (
          <p className="mt-4 text-sm text-muted">
            {t("toRegister")}{" "}
            <Link
              href={
                authQuery(nextPath, inviteCode)
                  ? { pathname: "/register", query: authQuery(nextPath, inviteCode)! }
                  : "/register"
              }
              className="text-accent hover:text-foreground"
            >
              {t("toRegisterLink")}
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">
              {t("toLogin")}{" "}
              <Link
                href={
                  authQuery(nextPath, inviteCode)
                    ? { pathname: "/login", query: authQuery(nextPath, inviteCode)! }
                    : "/login"
                }
                className="text-accent hover:text-foreground"
              >
                {t("toLoginLink")}
              </Link>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t("legalPrefix")}{" "}
              <Link href="/terms" className="text-accent hover:text-foreground">
                {t("terms")}
              </Link>
              {" · "}
              <Link href="/privacy" className="text-accent hover:text-foreground">
                {t("privacy")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
