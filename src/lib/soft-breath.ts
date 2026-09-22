export const BREATH_SECONDS = [30, 60] as const;

export type BreathSeconds = (typeof BREATH_SECONDS)[number];

export type BreathPhase = "idle" | "in" | "rest" | "out" | "done";

export type BreathPreference = {
  seconds: BreathSeconds;
  dismissed: boolean;
};

export const DEFAULT_BREATH_PREFERENCE: BreathPreference = {
  seconds: 30,
  dismissed: false,
};

export const BREATH_STORAGE_KEY = "softboring.softBreath.v1";
export const BREATH_EVENT = "softboring:soft-breath";

/** One quiet cycle: inhale 4s, rest 2s, exhale 4s. No audio. */
export const BREATH_IN_MS = 4_000;
export const BREATH_REST_MS = 2_000;
export const BREATH_OUT_MS = 4_000;
export const BREATH_CYCLE_MS = BREATH_IN_MS + BREATH_REST_MS + BREATH_OUT_MS;

const SCALE_MIN = 0.62;
const SCALE_MAX = 1;

let cachedPreferenceRaw: string | null | undefined;
let cachedPreference: BreathPreference | null = null;

export function isBreathSeconds(value: unknown): value is BreathSeconds {
  return value === 30 || value === 60;
}

export function normalizeBreathPreference(value: unknown): BreathPreference {
  if (!value || typeof value !== "object") return { ...DEFAULT_BREATH_PREFERENCE };
  const record = value as { seconds?: unknown; dismissed?: unknown };
  return {
    seconds: isBreathSeconds(record.seconds)
      ? record.seconds
      : DEFAULT_BREATH_PREFERENCE.seconds,
    dismissed: record.dismissed === true,
  };
}

export function breathTotalMs(seconds: BreathSeconds) {
  return seconds * 1000;
}

export type BreathFrame = {
  phase: BreathPhase;
  scale: number;
  remainingMs: number;
  progress: number;
};

/**
 * Visual frame for a running breath. `elapsedMs` is clamped to the session.
 * The circle only changes size — there is no tone.
 */
export function breathFrame(elapsedMs: number, seconds: BreathSeconds): BreathFrame {
  const total = breathTotalMs(seconds);
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (elapsed >= total) {
    return { phase: "done", scale: SCALE_MIN, remainingMs: 0, progress: 1 };
  }

  const into = elapsed % BREATH_CYCLE_MS;
  let phase: BreathPhase = "in";
  let scale = SCALE_MIN;
  if (into < BREATH_IN_MS) {
    phase = "in";
    scale = SCALE_MIN + (into / BREATH_IN_MS) * (SCALE_MAX - SCALE_MIN);
  } else if (into < BREATH_IN_MS + BREATH_REST_MS) {
    phase = "rest";
    scale = SCALE_MAX;
  } else {
    phase = "out";
    const outInto = into - BREATH_IN_MS - BREATH_REST_MS;
    scale = SCALE_MAX - (outInto / BREATH_OUT_MS) * (SCALE_MAX - SCALE_MIN);
  }

  return {
    phase,
    scale,
    remainingMs: total - elapsed,
    progress: elapsed / total,
  };
}

export function formatBreathClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function readBreathPreference(): BreathPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BREATH_STORAGE_KEY);
    if (raw === cachedPreferenceRaw) return cachedPreference;
    cachedPreferenceRaw = raw;
    if (!raw) {
      cachedPreference = null;
      return null;
    }
    cachedPreference = normalizeBreathPreference(JSON.parse(raw));
    return cachedPreference;
  } catch {
    cachedPreferenceRaw = null;
    cachedPreference = null;
    return null;
  }
}

export function writeBreathPreference(preference: BreathPreference) {
  if (typeof window === "undefined") return;
  const next = normalizeBreathPreference(preference);
  const raw = JSON.stringify(next);
  cachedPreferenceRaw = raw;
  cachedPreference = next;
  try {
    window.localStorage.setItem(BREATH_STORAGE_KEY, raw);
  } catch {
    // Private mode can ignore the preference. The circle still works this visit.
  }
  window.dispatchEvent(new Event(BREATH_EVENT));
}

export function subscribeBreathPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(BREATH_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(BREATH_EVENT, onStoreChange);
  };
}
