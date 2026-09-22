export const FOCUS_MINUTES = [15, 25] as const;

export type FocusMinutes = (typeof FOCUS_MINUTES)[number];

export type FocusPreference = {
  minutes: FocusMinutes;
  chime: boolean;
};

export const DEFAULT_FOCUS_PREFERENCE: FocusPreference = {
  minutes: 25,
  chime: true,
};

export const FOCUS_TIMER_STORAGE_KEY = "softboring.focusTimer.v1";
export const FOCUS_TIMER_EVENT = "softboring:focus-timer";

let cachedPreferenceRaw: string | null | undefined;
let cachedPreference: FocusPreference | null = null;

export function isFocusMinutes(value: unknown): value is FocusMinutes {
  return value === 15 || value === 25;
}

export function normalizeFocusPreference(value: unknown): FocusPreference {
  if (!value || typeof value !== "object") return { ...DEFAULT_FOCUS_PREFERENCE };
  const record = value as { minutes?: unknown; chime?: unknown };
  return {
    minutes: isFocusMinutes(record.minutes) ? record.minutes : DEFAULT_FOCUS_PREFERENCE.minutes,
    chime:
      typeof record.chime === "boolean" ? record.chime : DEFAULT_FOCUS_PREFERENCE.chime,
  };
}

export function storedFocusMinutes(value: unknown): FocusMinutes {
  return isFocusMinutes(value) ? value : DEFAULT_FOCUS_PREFERENCE.minutes;
}

export function storedFocusChime(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return value === 1;
  return DEFAULT_FOCUS_PREFERENCE.chime;
}

export function focusTotalMs(minutes: FocusMinutes) {
  return minutes * 60 * 1000;
}

/** Remaining time for an in-memory stretch. Sessions themselves are not stored. */
export function remainingFocusMs(endsAt: number, now: number) {
  if (!Number.isFinite(endsAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, endsAt - now);
}

export function formatFocusClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function focusProgress(remainingMs: number, totalMs: number) {
  if (!Number.isFinite(totalMs) || totalMs <= 0) return 0;
  const ratio = 1 - remainingMs / totalMs;
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

export function readFocusPreference(): FocusPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
    if (raw === cachedPreferenceRaw) return cachedPreference;
    cachedPreferenceRaw = raw;
    if (!raw) {
      cachedPreference = null;
      return null;
    }
    cachedPreference = normalizeFocusPreference(JSON.parse(raw));
    return cachedPreference;
  } catch {
    cachedPreferenceRaw = null;
    cachedPreference = null;
    return null;
  }
}

export function writeFocusPreference(preference: FocusPreference) {
  if (typeof window === "undefined") return;
  const next = normalizeFocusPreference(preference);
  const raw = JSON.stringify(next);
  cachedPreferenceRaw = raw;
  cachedPreference = next;
  try {
    window.localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, raw);
  } catch {
    // Private mode or a full disk can ignore the preference.
  }
  window.dispatchEvent(new Event(FOCUS_TIMER_EVENT));
}

export function subscribeFocusPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FOCUS_TIMER_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FOCUS_TIMER_EVENT, onStoreChange);
  };
}

/**
 * A short in-browser tone through Web Audio.
 * It does not alert the device, send mail, or push.
 * Safe to call when Web Audio is missing.
 */
export function playSoftChime() {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  for (const [index, freq] of notes.entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    const start = now + index * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.78);
  }
  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, 1700);
}
