/** Homepage decorative count of visible Soft Wall notes. Short enough to feel live. */
export const PUBLIC_WALL_NOTE_TTL_MS = 60_000;

export type PublicWallCountCache = {
  value: number;
  at: number;
};

/**
 * Reuse a recent public-note total. A clock that moves backward, a stale
 * window, or a missing cache loads again. Negative or non-finite counts
 * settle at zero so the homepage never shows a broken tally.
 */
export function nextPublicWallCount(input: {
  cache: PublicWallCountCache | null;
  now: number;
  load: () => number;
  ttl?: number;
}): { cache: PublicWallCountCache; value: number; fresh: boolean } {
  const ttl = input.ttl ?? PUBLIC_WALL_NOTE_TTL_MS;
  const cache = input.cache;
  if (
    cache &&
    Number.isFinite(cache.value) &&
    cache.value >= 0 &&
    Number.isFinite(cache.at) &&
    input.now >= cache.at &&
    input.now - cache.at < ttl
  ) {
    return { cache, value: cache.value, fresh: false };
  }

  const raw = input.load();
  const value = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  const next = { value, at: input.now };
  return { cache: next, value, fresh: true };
}
