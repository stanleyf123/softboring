"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { SoftMark } from "./soft-doodles";

const ERROR_KEYS = ["invalid_email", "generic"] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [done, setDone] = useState<"sent" | "no_email" | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        emailConfigured?: boolean;
      };
      if (!response.ok) {
        setError(data.error === "invalid_email" ? "invalid_email" : "generic");
        return;
      }
      setDone(data.emailConfigured === false ? "no_email" : "sent");
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[2rem] bg-paper shadow-card"
    >
      <div className="flex items-center gap-3 bg-blush/70 px-6 py-4 sm:px-8">
        <SoftMark className="h-8 w-8" />
        <div>
          <p className="font-display text-lg tracking-tight">{t("forgotCard")}</p>
          <p className="text-sm text-muted">{t("forgotCardNote")}</p>
        </div>
      </div>
      <div className="px-6 py-8 sm:px-8">
        {done === "sent" ? (
          <p className="leading-relaxed text-muted" role="status">
            {t("forgotSent")}
          </p>
        ) : done === "no_email" ? (
          <p className="leading-relaxed text-muted" role="status">
            {t("forgotNoEmail")}
          </p>
        ) : (
          <>
            <label className="block">
              <span className="text-sm text-muted">{t("email")}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-full border border-line bg-background px-5 py-3 outline-none focus:border-accent"
              />
            </label>
            {error ? (
              <p className="mt-5 text-sm text-accent" role="alert">
                {error === "invalid_email"
                  ? t("error.invalid_email")
                  : t("error.generic")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
            >
              {submitting ? t("submitting") : t("forgotSubmit")}
            </button>
          </>
        )}
        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="text-accent hover:text-foreground">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<"weak_password" | "invalid_token" | "generic" | null>(
    null,
  );

  if (!token) {
    return (
      <section className="rounded-[2rem] bg-paper px-6 py-8 shadow-card">
        <p className="leading-relaxed text-muted">{t("resetMissing")}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-accent">
          {t("forgotSubmit")}
        </Link>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(
          data.error === "weak_password" || data.error === "invalid_token"
            ? data.error
            : "generic",
        );
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[2rem] bg-paper shadow-card"
    >
      <div className="flex items-center gap-3 bg-blush/70 px-6 py-4 sm:px-8">
        <SoftMark className="h-8 w-8" />
        <div>
          <p className="font-display text-lg tracking-tight">{t("resetCard")}</p>
          <p className="text-sm text-muted">{t("resetCardNote")}</p>
        </div>
      </div>
      <div className="px-6 py-8 sm:px-8">
        <label className="block">
          <span className="text-sm text-muted">{t("password")}</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-full border border-line bg-background px-5 py-3 outline-none focus:border-accent"
          />
        </label>
        <p className="mt-2 text-sm text-muted">{t("passwordHint")}</p>
        {error ? (
          <p className="mt-5 text-sm text-accent" role="alert">
            {error === "weak_password"
              ? t("error.weak_password")
              : error === "invalid_token"
                ? t("error.invalid_token")
                : t("error.generic")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-8 w-full rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("resetSubmit")}
        </button>
      </div>
    </form>
  );
}
