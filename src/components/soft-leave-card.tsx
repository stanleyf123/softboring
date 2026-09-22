"use client";

import { useRouter } from "@/i18n/navigation";
import { LEAVE_PHRASE } from "@/lib/account-leave";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export function SoftLeaveCard({ email }: { email: string }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [typedEmail, setTypedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = phrase === LEAVE_PHRASE && typedEmail.trim().length > 0;

  async function leave(event: FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, email: typedEmail }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "generic");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  function errorCopy(code: string | null) {
    switch (code) {
      case "phrase_mismatch":
        return t("leaveErrorPhrase");
      case "email_mismatch":
        return t("leaveErrorEmail");
      default:
        return t("leaveError");
    }
  }

  return (
    <form
      onSubmit={leave}
      className="mt-10 rounded-[1.5rem] border border-line/80 bg-cream/40 px-5 py-5"
    >
      <p className="font-display text-lg tracking-tight">{t("leaveTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("leaveBody")}</p>
      <p className="mt-3 text-sm text-muted">{t("leaveEmailHint", { email })}</p>
      <label className="mt-4 block text-sm">
        <span className="text-muted">{t("leavePhraseLabel")}</span>
        <input
          value={phrase}
          onChange={(event) => {
            setPhrase(event.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("leavePhrasePlaceholder")}
          className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="text-muted">{t("leaveEmailLabel")}</span>
        <input
          value={typedEmail}
          onChange={(event) => {
            setTypedEmail(event.target.value);
            setError(null);
          }}
          type="email"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !ready}
        className="mt-4 rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
      >
        {busy ? t("leaveWorking") : t("leaveConfirm")}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {errorCopy(error)}
        </p>
      ) : null}
    </form>
  );
}
