"use client";

import {
  readSoundscapeEnabled,
  soundscapeClick,
  startSoftSoundscape,
  stopSoftSoundscape,
  subscribeSoundscape,
  writeSoundscapeEnabled,
} from "@/lib/soft-soundscape";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

export function SoftSoundscapeToggle() {
  const t = useTranslations("Soundscape");
  const hydrated = useHydrated();
  const stored = useSyncExternalStore(subscribeSoundscape, readSoundscapeEnabled, () => false);
  const enabled = hydrated && stored;
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    function onStore() {
      if (!readSoundscapeEnabled()) {
        stopSoftSoundscape();
        setPlaying(false);
      }
    }
    window.addEventListener("storage", onStore);
    return () => {
      window.removeEventListener("storage", onStore);
      stopSoftSoundscape();
    };
  }, []);

  function onPress() {
    const action = soundscapeClick({ playing, enabled });
    if (action === "stop") {
      writeSoundscapeEnabled(false);
      stopSoftSoundscape();
      setPlaying(false);
      return;
    }
    const started = startSoftSoundscape();
    if (!started) return;
    if (action === "start") writeSoundscapeEnabled(true);
    setPlaying(true);
  }

  const mode = playing ? "playing" : enabled ? "resume" : "off";
  const label = playing ? t("playing") : enabled ? t("resume") : t("off");

  return (
    <section
      className="rounded-[1.75rem] bg-mint/50 px-5 py-5 shadow-card sm:px-6"
      data-soft-soundscape={mode}
      aria-labelledby="soft-soundscape-title"
    >
      <p id="soft-soundscape-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("hint")}</p>
      <button
        type="button"
        onClick={onPress}
        aria-pressed={playing || enabled}
        className={`soft-sound-toggle mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm shadow-card ${
          playing ? "soft-sound-live bg-mint text-foreground" : "bg-paper/90 text-muted"
        }`}
      >
        {label}
      </button>
    </section>
  );
}
