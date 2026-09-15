"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function PaymentsNotice({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Pricing");
  return (
    <p
      className={
        compact
          ? "text-sm leading-relaxed text-muted"
          : "rounded-2xl bg-peach/70 px-4 py-3 text-sm leading-relaxed text-muted"
      }
      role="status"
    >
      {t("paymentsOff")}
    </p>
  );
}

export function CheckoutButtons({
  configured,
  loggedIn,
  softPlus,
  yearlyAvailable,
  monthlyLabel,
  yearlyLabel,
}: {
  configured: boolean;
  loggedIn: boolean;
  softPlus: boolean;
  yearlyAvailable: boolean;
  monthlyLabel: string | null;
  yearlyLabel: string | null;
}) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState<"not_configured" | "generic" | null>(null);

  async function startCheckout(interval: "month" | "year") {
    if (!configured || !loggedIn || softPlus || busy) return;
    setBusy(interval);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error === "not_configured" ? "not_configured" : "generic");
    } catch {
      setError("generic");
    } finally {
      setBusy(null);
    }
  }

  if (softPlus) {
    return (
      <p className="rounded-full bg-mint px-4 py-2 text-sm">{t("currentPlus")}</p>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/register", query: { next: "/pricing" } }}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("ctaRegister")}
        </Link>
        <Link
          href={{ pathname: "/login", query: { next: "/pricing" } }}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground"
        >
          {t("ctaLogin")}
        </Link>
      </div>
    );
  }

  if (!configured) {
    return <PaymentsNotice />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startCheckout("month")}
          disabled={busy !== null}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {busy === "month"
            ? t("redirecting")
            : monthlyLabel
              ? t("ctaMonthlyPrice", { price: monthlyLabel })
              : t("ctaMonthly")}
        </button>
        {yearlyAvailable ? (
          <button
            type="button"
            onClick={() => startCheckout("year")}
            disabled={busy !== null}
            className="rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            {busy === "year"
              ? t("redirecting")
              : yearlyLabel
                ? t("ctaYearlyPrice", { price: yearlyLabel })
                : t("ctaYearly")}
          </button>
        ) : null}
      </div>
      {error === "not_configured" ? <PaymentsNotice compact /> : null}
      {error === "generic" ? (
        <p className="text-sm text-accent" role="alert">
          {t("checkoutError")}
        </p>
      ) : null}
    </div>
  );
}

export function PortalButton() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function openPortal() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
      };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={busy}
        className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
      >
        {busy ? t("openingPortal") : t("manage")}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-accent" role="alert">
          {t("portalError")}
        </p>
      ) : null}
    </div>
  );
}
