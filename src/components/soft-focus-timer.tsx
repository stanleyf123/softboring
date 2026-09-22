"use client";

import {
  DEFAULT_FOCUS_PREFERENCE,
  FOCUS_MINUTES,
  focusProgress,
  focusTotalMs,
  formatFocusClock,
  isFocusMinutes,
  playSoftChime,
  readFocusPreference,
  remainingFocusMs,
  subscribeFocusPreference,
  writeFocusPreference,
  type FocusMinutes,
  type FocusPreference,
} from "@/lib/focus-timer";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Phase = "idle" | "running" | "paused" | "done";

export function SoftFocusTimer({
  signedIn,
  initialMinutes = DEFAULT_FOCUS_PREFERENCE.minutes,
  initialChime = DEFAULT_FOCUS_PREFERENCE.chime,
}: {
  signedIn: boolean;
  initialMinutes?: FocusMinutes;
  initialChime?: boolean;
}) {
  const t = useTranslations("FocusTimer");
  const safeMinutes = isFocusMinutes(initialMinutes)
    ? initialMinutes
    : DEFAULT_FOCUS_PREFERENCE.minutes;
  const stored = useSyncExternalStore(
    subscribeFocusPreference,
    readFocusPreference,
    () => null,
  );
  const [accountMinutes, setAccountMinutes] = useState<FocusMinutes>(safeMinutes);
  const [accountChime, setAccountChime] = useState(initialChime);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(focusTotalMs(safeMinutes));
  const endsAt = useRef<number | null>(null);
  const chimed = useRef(false);
  const minutes = signedIn ? accountMinutes : (stored?.minutes ?? safeMinutes);
  const chime = signedIn ? accountChime : (stored?.chime ?? initialChime);
  const chimeRef = useRef(chime);

  useEffect(() => {
    chimeRef.current = chime;
  }, [chime]);

  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const ends = endsAt.current;
      if (ends == null) return;
      const left = remainingFocusMs(ends, Date.now());
      if (left <= 0) {
        endsAt.current = null;
        setRemaining(0);
        setPhase("done");
        if (chimeRef.current && !chimed.current) {
          chimed.current = true;
          playSoftChime();
        }
        return;
      }
      setRemaining(left);
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  function persist(next: FocusPreference) {
    writeFocusPreference(next);
    if (!signedIn) return;
    setAccountMinutes(next.minutes);
    setAccountChime(next.chime);
    void fetch("/api/account/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focusMinutes: next.minutes, focusChime: next.chime }),
    }).catch(() => undefined);
  }

  function chooseMinutes(next: FocusMinutes) {
    if (phase === "running" || phase === "paused") return;
    chimed.current = false;
    setPhase("idle");
    setRemaining(focusTotalMs(next));
    persist({ minutes: next, chime });
  }

  function toggleChime() {
    persist({ minutes, chime: !chime });
  }

  function begin(fromMs: number) {
    chimed.current = false;
    endsAt.current = Date.now() + fromMs;
    setRemaining(fromMs);
    setPhase("running");
  }

  function pause() {
    if (endsAt.current == null) return;
    const left = remainingFocusMs(endsAt.current, Date.now());
    endsAt.current = null;
    setRemaining(left);
    setPhase("paused");
  }

  function reset() {
    endsAt.current = null;
    chimed.current = false;
    setRemaining(focusTotalMs(minutes));
    setPhase("idle");
  }

  const total = focusTotalMs(minutes);
  const shownRemaining = phase === "idle" ? total : remaining;
  const progress = focusProgress(shownRemaining, total);
  const clock = formatFocusClock(shownRemaining);
  const status =
    phase === "done"
      ? t("done")
      : phase === "running"
        ? t("running")
        : phase === "paused"
          ? t("paused")
          : t("idle");
  const lockedLength = phase === "running" || phase === "paused";

  return (
    <section
      className="rounded-[1.75rem] bg-mint/45 px-5 py-5 shadow-card sm:px-6"
      aria-labelledby="soft-focus-title"
      data-focus-timer
      data-focus-phase={phase}
      data-focus-minutes={minutes}
      data-focus-chime={chime ? "1" : "0"}
    >
      <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 id="soft-focus-title" className="font-display text-2xl tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
        </div>
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full shadow-card"
          style={{
            background: `conic-gradient(var(--sage) ${Math.round(progress * 360)}deg, var(--paper) 0deg)`,
          }}
          aria-hidden="true"
        >
          <div className="grid h-[6.15rem] w-[6.15rem] place-items-center rounded-full bg-paper font-display text-3xl tracking-tight">
            {clock}
          </div>
        </div>
      </div>

      <p className="sr-only" role="status">
        {t("ariaStatus", { time: clock, status })}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80" aria-hidden="true">
        {status}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={t("ariaGroup")}>
        {FOCUS_MINUTES.map((option) => {
          const selected = minutes === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={lockedLength}
              onClick={() => chooseMinutes(option)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm shadow-card disabled:opacity-60 ${
                selected ? "bg-accent text-paper" : "bg-paper text-muted"
              }`}
            >
              {option === 15 ? t("min15") : t("min25")}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={chime}
          onClick={toggleChime}
          className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm shadow-card ${
            chime ? "bg-blush text-foreground" : "bg-paper text-muted"
          }`}
        >
          {t("chime")}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{t("chimeHint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {phase === "running" ? (
          <button
            type="button"
            onClick={pause}
            className="inline-flex min-h-11 items-center rounded-full bg-paper px-5 py-2 text-sm shadow-card"
          >
            {t("pause")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => begin(phase === "paused" ? remaining : total)}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2 text-sm text-paper shadow-card"
          >
            {phase === "paused" ? t("resume") : t("start")}
          </button>
        )}
        {phase !== "idle" ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2 text-sm text-muted shadow-card"
          >
            {t("reset")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
