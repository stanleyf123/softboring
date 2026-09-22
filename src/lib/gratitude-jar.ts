/** One private line. Newlines are folded so the jar stays a jar, not a journal. */
export const GRATITUDE_MAX = 140;

/** Soft ceiling so a jar stays a jar. */
export const GRATITUDE_JAR_CAP = 240;

export function parseGratitudeBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const single = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const clipped = Array.from(single).slice(0, GRATITUDE_MAX).join("").trim();
  return clipped.length > 0 ? clipped : null;
}

/**
 * Pick an index from a stable list. `randomUnit` is in [0, 1).
 * Values outside that range are clamped so a bad random source still returns a line.
 */
export function gratitudePickIndex(count: number, randomUnit: number): number {
  if (!Number.isInteger(count) || count <= 0) return -1;
  const unit = Number.isFinite(randomUnit) ? Math.min(Math.max(randomUnit, 0), 0.999999) : 0;
  return Math.floor(unit * count);
}
