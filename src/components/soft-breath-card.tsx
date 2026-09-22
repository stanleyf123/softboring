"use client";

import {
  BREATH_SECONDS,
  breathFrame,
  breathTotalMs,
  DEFAULT_BREATH_PREFERENCE,
  formatBreathClock,
  readBreathPreference,
  subscribeBreathPreference,
  writeBreathPreference,
  type BreathPhase,
  type BreathPreference,
  type BreathSeconds,
} from "@/lib/soft-breath";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type RunPhase = "idle" | "running" | "done";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function SoftBreathCard() {
  const t = useTranslations("SoftBreath");
  const reduced = usePrefersReducedMotion();
  const stored = useSyncExternalStore(
    subscribeBreathPreference,
    readBreathPreference,
    () => null,
  );
  const preference = stored ?? DEFAULT_BREATH_PREFERENCE;
  const seconds = preference.seconds;
  const dismissed = preference.dismissed;
  const [run, setRun] = useState<RunPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (run !== "running") return;
    const tick = () => {
      const start = startedAt.current;
      if (start == null) return;
      const next = Date.now() - start;
      if (next >= breathTotalMs(seconds)) {
        startedAt.current = null;
        setElapsed(breathTotalMs(seconds));
        setRun("done");
        return;
      }
      setElapsed(next);
    };
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [run, seconds]);

  function persist(next: BreathPreference) {
    writeBreathPreference(next);
  }

  function chooseSeconds(next: BreathSeconds) {
    if (run === "running") return;
    setRun("idle");
    setElapsed(0);
    persist({ seconds: next, dismissed });
  }

  function begin() {
    startedAt.current = Date.now();
    setElapsed(0);
    setRun("running");
  }

  function stop() {
    startedAt.current = null;
    setElapsed(0);
    setRun("idle");
  }

  const frame =
    run === "running" || run === "done"
      ? breathFrame(elapsed, seconds)
      : { phase: "idle" as BreathPhase, scale: 0.72, remainingMs: breathTotalMs(seconds), progress: 0 };
  const shownScale = reduced ? 0.82 : frame.scale;
  const phaseLabel =
    frame.phase === "in"
      ? t("in")
      : frame.phase === "rest"
        ? t("rest")
        : frame.phase === "out"
          ? t("out")
          : frame.phase === "done"
            ? t("done")
            : t("idle");
  const clock = formatBreathClock(frame.remainingMs);

  if (dismissed) {
    return (
      <div className="print:hidden" data-soft-breath data-breath-dismissed="1">
        <button
          type="button"
          onClick={() => persist({ seconds, dismissed: false })}
          className="inline-flex min-h-11 items-center rounded-full bg-blush/70 px-4 py-2 text-sm text-foreground shadow-card"
        >
          {t("restore")}
        </button>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("restoreHint")}</p>
      </div>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-blush/45 px-5 py-5 shadow-card print:hidden sm:px-6"
      aria-labelledby="soft-breath-title"
      data-soft-breath
      data-breath-dismissed="0"
      data-breath-phase={frame.phase}
      data-breath-seconds={seconds}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
          <h2 id="soft-breath-title" className="mt-1 font-display text-2xl tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            stop();
            persist({ seconds, dismissed: true });
          }}
          className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm text-muted"
        >
          {t("dismiss")}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div
          className="grid h-36 w-36 shrink-0 place-items-center"
          aria-hidden="true"
          data-breath-circle
        >
          <div
            className="rounded-full bg-peach shadow-card"
            style={{
              width: `${shownScale * 7.5}rem`,
              height: `${shownScale * 7.5}rem`,
              transition: reduced ? "none" : "width 120ms linear, height 120ms linear",
            }}
          />
        </div>
        <div>
          <p className="sr-only" role="status">
            {t("ariaStatus", { phase: phaseLabel, time: clock })}
          </p>
          <p className="font-display text-xl tracking-tight" aria-hidden="true">
            {phaseLabel}
          </p>
          <p className="mt-1 font-display text-3xl tracking-tight text-accent" aria-hidden="true">
            {clock}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label={t("ariaGroup")}>
        {BREATH_SECONDS.map((option) => {
          const selected = seconds === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={run === "running"}
              onClick={() => chooseSeconds(option)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm shadow-card disabled:opacity-60 ${
                selected ? "bg-accent text-paper" : "bg-paper text-muted"
              }`}
            >
              {option === 30 ? t("sec30") : t("sec60")}
            </button>
          );
        })}
        {run === "running" ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex min-h-11 items-center rounded-full bg-paper px-5 py-2 text-sm shadow-card"
          >
            {t("stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={begin}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2 text-sm text-paper shadow-card"
          >
            {run === "done" ? t("again") : t("start")}
          </button>
        )}
      </div>
    </section>
  );
}
