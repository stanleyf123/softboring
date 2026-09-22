export const SOFT_TAG_LIMIT = 5;
export const SOFT_TAG_MAX_LENGTH = 16;

const TAG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .·'\u2019-]*$/u;

export type SoftTagError = "invalid" | "too_many" | "too_long";

export function softTagLength(value: string) {
  return Array.from(value).length;
}

export function normalizeSoftTags(
  value: unknown,
): { ok: true; tags: string[] } | { ok: false; error: SoftTagError } {
  if (!Array.isArray(value)) return { ok: false, error: "invalid" };
  if (value.length > SOFT_TAG_LIMIT) return { ok: false, error: "too_many" };

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return { ok: false, error: "invalid" };
    const cleaned = item.replace(/\s+/g, " ").trim();
    if (!cleaned) return { ok: false, error: "invalid" };
    if (softTagLength(cleaned) > SOFT_TAG_MAX_LENGTH) return { ok: false, error: "too_long" };
    if (!TAG_PATTERN.test(cleaned)) return { ok: false, error: "invalid" };
    const key = cleaned.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(cleaned);
  }
  return { ok: true, tags };
}

export function parseStoredSoftTags(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = normalizeSoftTags(JSON.parse(value));
    return parsed.ok ? parsed.tags : [];
  } catch {
    return [];
  }
}

/** Tags stay private to Soft+. Locked weeks and Free desks do not receive them. */
export function visibleSoftTags(tags: string[] | undefined, softPlus: boolean, locked: boolean) {
  if (!softPlus || locked) return [];
  return tags ?? [];
}

export function uniqueSoftTags(
  reviews: Array<{ locked?: boolean; softTags?: string[] | null }>,
) {
  const seen = new Map<string, string>();
  for (const review of reviews) {
    if (review.locked) continue;
    for (const tag of review.softTags ?? []) {
      const key = tag.toLocaleLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
  }
  return [...seen.values()];
}

export function reviewHasSoftTag(tags: string[] | undefined, tag: string) {
  const key = tag.trim().toLocaleLowerCase();
  if (!key) return true;
  return (tags ?? []).some((item) => item.toLocaleLowerCase() === key);
}
