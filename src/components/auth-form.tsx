"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { safeAppPath } from "@/lib/public-origin";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Mode = "login" | "register";

const ERROR_KEYS = [
  "invalid_credentials",
  "email_taken",
  "weak_password",
  "invalid_email",
] as const;

type ErrorKey = (typeof ERROR_KEYS)[number];

function errorMessageKey(code: string | undefined): ErrorKey | "generic" {
  if (code && (ERROR_KEYS as readonly string[]).includes(code)) {
    return code as ErrorKey;
  }
  return "generic";
}

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: Mode;
  nextPath?: string | null;
}) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorKey | "generic" | null>(null);

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
  const destination = safeAppPath(nextPath, "/account");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(errorMessageKey(data.error));
        return;
      }
      router.push(destination);
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
      className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8"
    >
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
      ) : null}

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
                  : t("error.generic")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 w-full rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
      >
        {submitting ? t("submitting") : t(mode === "login" ? "loginSubmit" : "registerSubmit")}
      </button>

      <p className="mt-6 text-sm text-muted">{t("guestHint")}</p>

      {mode === "login" ? (
        <p className="mt-4 text-sm text-muted">
          {t("toRegister")}{" "}
          <Link href="/register" className="text-accent hover:text-foreground">
            {t("toRegisterLink")}
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {t("toLogin")}{" "}
          <Link href="/login" className="text-accent hover:text-foreground">
            {t("toLoginLink")}
          </Link>
        </p>
      )}
    </form>
  );
}
