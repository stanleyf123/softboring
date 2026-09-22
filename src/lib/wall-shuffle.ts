/** A visit-only corkboard order. Nothing here is stored. */

export function nextShuffleSeed(previous: number | null): number {
  if (previous == null || !Number.isFinite(previous)) return 1;
  const next = (Math.trunc(previous) + 1) >>> 0;
  return next === 0 ? 1 : next;
}

function unitRandom(seed: number) {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Settle animation only when a shuffle happened and motion is welcome. */
export function wallShuffleFeelClass(shuffled: boolean, reducedMotion: boolean) {
  if (!shuffled || reducedMotion) return "relative";
  return "relative soft-wall-settle";
}

/** Fisher–Yates with a tiny seeded generator. Does not mutate `notes`. */
export function shuffleWallNotes<T>(notes: readonly T[], seed: number): T[] {
  const copy = notes.slice();
  if (copy.length < 2 || !Number.isFinite(seed)) return copy;
  const random = unitRandom(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index] as T;
    copy[index] = copy[swap] as T;
    copy[swap] = current;
  }
  return copy;
}
