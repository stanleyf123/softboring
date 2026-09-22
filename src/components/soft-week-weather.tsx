"use client";

import { WEEK_PAUSE_CHANGED_EVENT } from "@/lib/pause-week";
import { softWeekWeather, type SoftWeatherKind } from "@/lib/soft-weather";
import type { WeekMood } from "@/lib/week-mood";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const WASH: Record<SoftWeatherKind, string> = {
  sky: "bg-sky/45",
  open: "bg-cream/90",
  rest: "bg-mint/55",
  sun: "bg-peach/75",
  breeze: "bg-mint/65",
  blush: "bg-blush/75",
  cream: "bg-cream",
  mist: "bg-lavender/70",
};

function SkyMark({ kind }: { kind: SoftWeatherKind }) {
  const drift = kind === "sky" ? "" : "soft-weather-drift";
  return (
    <svg
      className="h-28 w-full max-w-[11rem]"
      viewBox="0 0 176 112"
      fill="none"
      aria-hidden="true"
      data-weather-mark={kind}
    >
      <rect width="176" height="112" rx="28" className="fill-paper/80" />
      {kind === "sun" || kind === "open" || kind === "sky" ? (
        <circle cx="126" cy="38" r={kind === "sun" ? 16 : 12} className="fill-peach" />
      ) : null}
      {kind === "blush" ? <circle cx="124" cy="40" r="18" className="fill-blush" /> : null}
      {kind === "mist" ? <circle cx="122" cy="42" r="16" className="fill-lavender" /> : null}
      <g className={drift}>
        <ellipse cx="58" cy="46" rx="26" ry="12" className="fill-paper" />
        <ellipse cx="78" cy="42" rx="18" ry="11" className="fill-cream" />
        {kind === "blush" ? <ellipse cx="48" cy="58" rx="22" ry="9" className="fill-blush" /> : null}
        {kind === "breeze" ? (
          <path
            d="M28 78c16-8 24-8 36 0s22 8 34 0 20-8 32 0"
            className="stroke-sage"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : null}
      </g>
      {kind === "rest" || kind === "mist" || kind === "cream" ? (
        <path
          d="M16 84c22-10 40-8 58 2s36 10 54 0 30-10 40-2v18H16V84Z"
          className={kind === "mist" ? "fill-lavender/80" : kind === "rest" ? "fill-mint" : "fill-cream"}
        />
      ) : (
        <path d="M12 86c24-12 44-6 64 4s40 12 60 0 28-12 36-4v22H12V86Z" className="fill-mint/80" />
      )}
    </svg>
  );
}

export function SoftWeekWeather({
  signedIn,
  initialPaused,
  mood,
  weekKey,
}: {
  signedIn: boolean;
  initialPaused: boolean;
  mood: WeekMood | null;
  weekKey: string;
}) {
  const t = useTranslations("SoftWeather");
  const [paused, setPaused] = useState(initialPaused);

  useEffect(() => {
    function onPause(event: Event) {
      const detail = (event as CustomEvent<{ paused?: boolean }>).detail;
      if (typeof detail?.paused === "boolean") setPaused(detail.paused);
    }
    window.addEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
    return () => window.removeEventListener(WEEK_PAUSE_CHANGED_EVENT, onPause);
  }, []);

  const kind = softWeekWeather({ signedIn, paused, mood });
  const guest = kind === "sky";
  const copy = {
    sky: { title: t("title_sky"), body: t("body_sky") },
    open: { title: t("title_open"), body: t("body_open") },
    rest: { title: t("title_rest"), body: t("body_rest") },
    sun: { title: t("title_sun"), body: t("body_sun") },
    breeze: { title: t("title_breeze"), body: t("body_breeze") },
    blush: { title: t("title_blush"), body: t("body_blush") },
    cream: { title: t("title_cream"), body: t("body_cream") },
    mist: { title: t("title_mist"), body: t("body_mist") },
  }[kind];

  return (
    <section
      className={`flex flex-col gap-4 rounded-[1.75rem] px-5 py-5 shadow-card sm:flex-row sm:items-center sm:px-6 ${WASH[kind]}`}
      aria-labelledby="soft-weather-title"
      data-soft-weather={kind}
      data-soft-weather-guest={guest ? "1" : "0"}
    >
      <SkyMark kind={kind} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm italic text-accent">
          {guest ? t("guestEyebrow") : t("eyebrow")}
        </p>
        <h2 id="soft-weather-title" className="mt-1 font-display text-2xl tracking-tight">
          {copy.title}
        </h2>
        {signedIn && weekKey ? (
          <p className="mt-2 text-xs text-muted">{t("weekLabel", { week: weekKey })}</p>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-muted">{copy.body}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("decorative")}</p>
      </div>
    </section>
  );
}
