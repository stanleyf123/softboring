"use client";

import { DeskEdges } from "@/components/desk-edges";
import { Link } from "@/i18n/navigation";
import { WEEK_PAUSE_ANCHOR } from "@/lib/desk-edges";
import { WEEK_PAUSE_CHANGED_EVENT } from "@/lib/pause-week";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type PausePayload = {
  weekKey: string;
  paused: boolean;
  timezone?: string;
};

export function SoftPauseCard({
  signedIn,
  initialWeekKey = "",
  initialPaused = false,
}: {
  signedIn: boolean;
  initialWeekKey?: string;
  initialPaused?: boolean;
}) {
  const t = useTranslations("SoftPause");
  const [weekKey, setWeekKey] = useState(initialWeekKey);
  const [paused, setPaused] = useState(initialPaused);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    function onPause(event: Event) {
      const detail = (event as CustomEvent<{ paused?: boolean; weekKey?: string }>).detail;
      if (!detail || typeof detail.paused !== "boolean") return;
      setPaused(detail.paused);
      if (detail.weekKey) setWeekKey(detail.weekKey);
      setResumed(!detail.paused);
      setError(false);
    }
    window.addEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
    return () => window.removeEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
  }, []);

  if (!signedIn) {
    return (
      <section
        id={WEEK_PAUSE_ANCHOR}
        className="scroll-mt-28 rounded-[1.75rem] bg-cream/90 px-5 py-5 shadow-card sm:px-6"
        data-soft-pause="guest"
      >
        <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
        <h2 className="mt-1 font-display text-2xl tracking-tight">{t("guestTitle")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/review" } }}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 py-2 text-sm text-muted shadow-card"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  async function toggle() {
    setSaving(true);
    setError(false);
    setResumed(false);
    try {
      const response = await fetch("/api/week-pause", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const data = (await response.json()) as PausePayload;
      setWeekKey(data.weekKey);
      setPaused(data.paused);
      setResumed(!data.paused);
      window.dispatchEvent(
        new CustomEvent(WEEK_PAUSE_CHANGED_EVENT, {
          detail: { paused: data.paused, weekKey: data.weekKey },
        }),
      );
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id={WEEK_PAUSE_ANCHOR}
      className={`scroll-mt-28 rounded-[1.75rem] px-5 py-5 shadow-card sm:px-6 ${
        paused ? "bg-blush/75" : "bg-cream/90"
      }`}
      aria-labelledby="soft-pause-title"
      data-soft-pause={paused ? "resting" : "open"}
    >
      <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
      <h2 id="soft-pause-title" className="mt-1 font-display text-2xl tracking-tight">
        {paused ? t("pausedTitle") : t("title")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {paused ? t("pausedBody") : t("lead")}
      </p>
      {weekKey ? (
        <p className="mt-2 text-xs text-muted">{t("weekLabel", { week: weekKey })}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={saving}
        aria-pressed={paused}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
      >
        {saving ? t("saving") : paused ? t("resume") : t("pause")}
      </button>
      {resumed ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("resumed")}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {t("saveError")}
        </p>
      ) : null}
      <DeskEdges signedIn variant="beside-pause" />
    </section>
  );
}
