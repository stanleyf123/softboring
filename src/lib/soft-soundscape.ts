export const SOUNDSCAPE_STORAGE_KEY = "softboring.soundscape.v1";
export const SOUNDSCAPE_EVENT = "softboring:soundscape";

/** Master level stays under a whisper. Voices are scaled inside this gain. */
export const SOUNDSCAPE_MASTER_GAIN = 0.016;

/** Extra slow lift on the master gain. Peak stays under 0.03. */
export const SOUNDSCAPE_LFO_DEPTH = 0.004;

export const SOUNDSCAPE_VOICES = [
  { frequency: 196, type: "sine" as const, gain: 0.55 },
  { frequency: 246.94, type: "sine" as const, gain: 0.28 },
  { frequency: 293.66, type: "triangle" as const, gain: 0.12 },
] as const;

export type SoundscapeAction = "stop" | "resume" | "start";

export type SoundscapeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

/** Worst-case sum if every voice peaks together, including the slow breath. */
export function soundscapePeakGain() {
  const voices = SOUNDSCAPE_VOICES.reduce((sum, voice) => sum + voice.gain, 0);
  return voices * (SOUNDSCAPE_MASTER_GAIN + SOUNDSCAPE_LFO_DEPTH);
}

/**
 * Only an explicit `{ enabled: true }` turns the pad on.
 * Missing, broken, or any other shape stays off.
 */
export function soundscapeEnabledFromStorage(raw: string | null | undefined) {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { enabled?: unknown };
    return parsed?.enabled === true;
  } catch {
    return false;
  }
}

export function readSoundscapeEnabled(storage?: SoundscapeStorage | null) {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return false;
  try {
    return soundscapeEnabledFromStorage(store.getItem(SOUNDSCAPE_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function writeSoundscapeEnabled(enabled: boolean, storage?: SoundscapeStorage | null) {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  try {
    store.setItem(
      SOUNDSCAPE_STORAGE_KEY,
      JSON.stringify({ enabled: enabled === true }),
    );
  } catch {
    return;
  }
  if (typeof window !== "undefined" && storage == null) {
    window.dispatchEvent(new Event(SOUNDSCAPE_EVENT));
  }
}

export function subscribeSoundscape(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SOUNDSCAPE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SOUNDSCAPE_EVENT, onStoreChange);
  };
}

/**
 * Playback never starts by itself.
 * A remembered "on" asks for one more tap (`resume`) because browsers
 * require a gesture. `stop` is the only action while a pad is already going.
 */
export function soundscapeClick(state: { playing: boolean; enabled: boolean }): SoundscapeAction {
  if (state.playing) return "stop";
  if (state.enabled) return "resume";
  return "start";
}

type PadSession = {
  stop: () => void;
};

let activePad: PadSession | null = null;

export function soundscapeIsPlaying() {
  return activePad != null;
}

function audioContextCtor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/**
 * Very quiet looped pad. Call only from a click or key gesture.
 * Safe when Web Audio is missing. Does not notify, mail, or persist audio.
 */
export function startSoftSoundscape() {
  const AudioCtx = audioContextCtor();
  if (!AudioCtx) return false;
  stopSoftSoundscape();

  const ctx = new AudioCtx();
  const master = ctx.createGain();
  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  for (const voice of SOUNDSCAPE_VOICES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.frequency, now);
    gain.gain.setValueAtTime(voice.gain, now);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    oscillators.push(osc);
  }

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.07, now);
  lfoGain.gain.setValueAtTime(SOUNDSCAPE_LFO_DEPTH, now);
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start(now);

  master.gain.exponentialRampToValueAtTime(SOUNDSCAPE_MASTER_GAIN, now + 1.6);
  void ctx.resume().catch(() => undefined);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const at = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(at);
      const current = Math.max(master.gain.value, 0.0001);
      master.gain.setValueAtTime(current, at);
      master.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
    } catch {
      // A closed context can ignore the fade.
    }
    window.setTimeout(() => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped.
        }
      }
      try {
        lfo.stop();
      } catch {
        // Already stopped.
      }
      void ctx.close().catch(() => undefined);
    }, 650);
    if (activePad?.stop === stop) activePad = null;
  };

  activePad = { stop };
  return true;
}

export function stopSoftSoundscape() {
  activePad?.stop();
  activePad = null;
}
