"use client";

import { Link } from "@/i18n/navigation";
import { WEEK_PAUSE_CHANGED_EVENT } from "@/lib/pause-week";
import {
  shouldShowStreakProtectChip,
  type StreakProtectView,
} from "@/lib/streak-protect";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function isView(value: unknown): value is StreakProtectView {
  if (!value || typeof value !== "object") return false;
  const view = value as StreakProtectView;
  return typeof view.atRisk === "boolean" && typeof view.weekKey === "string";
}

export function StreakProtectChip({ initial }: { initial: StreakProtectView }) {
  const t = useTranslations("StreakProtect");
  const [view, setView] = useState(initial);
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"used" | "generic" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/streak-protect", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as unknown;
        if (!isView(data) || cancelled) return;
        setView(data);
        if (!data.paused) setKept(false);
      } catch {
        // The chip can stay on the view it already has.
      }
    }
    function onPause() {
      void refresh();
    }
    window.addEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
    return () => {
      cancelled = true;
      window.removeEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
    };
  }, []);

  async function spendToken() {
    if (busy || !view.available) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/streak-protect", { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | (StreakProtectView & { error?: string })
        | null;
      if (data && isView(data)) setView(data);
      if (!response.ok) {
        setError(data?.error === "already_used" ? "used" : "generic");
        return;
      }
      setKept(true);
      if (data && isView(data)) {
        window.dispatchEvent(
          new CustomEvent(WEEK_PAUSE_CHANGED_EVENT, {
            detail: { paused: true, weekKey: data.weekKey },
          }),
        );
      }
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  if (!shouldShowStreakProtectChip(view) && !kept) return null;

  if (!view.softPlus) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-full bg-peach/80 px-4 py-2 text-sm shadow-card"
        data-streak-protect="tease"
      >
        <p className="leading-relaxed">{t("tease", { count: view.streak })}</p>
        <Link href="/pricing" className="font-medium text-accent">
          {t("teaseCta")}
        </Link>
      </div>
    );
  }

  if (kept || view.paused) {
    return (
      <p
        className="rounded-full bg-mint/80 px-4 py-2 text-sm leading-relaxed shadow-card"
        role="status"
        data-streak-protect="kept"
      >
        {t("saved")}
      </p>
    );
  }

  if (view.usedThisMonth) {
    return (
      <p
        className="rounded-full bg-cream px-4 py-2 text-sm leading-relaxed text-muted shadow-card"
        data-streak-protect="used"
      >
        {t("used")}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-full bg-blush/80 px-4 py-2 text-sm shadow-card"
      data-streak-protect="ready"
    >
      <p className="leading-relaxed">{t("chip", { count: view.streak })}</p>
      <button
        type="button"
        onClick={() => void spendToken()}
        disabled={busy || !view.available}
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
      >
        {busy ? t("using") : t("use")}
      </button>
      <span className="text-xs text-muted">{t("privacy")}</span>
      {error ? (
        <p className="basis-full text-sm text-muted" role="alert">
          {error === "used" ? t("usedError") : t("error")}
        </p>
      ) : null}
    </div>
  );
}
