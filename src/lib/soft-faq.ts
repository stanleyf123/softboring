/** Stable ids for the free pricing FAQ. Order is the reading order. */
export const SOFT_FAQ_IDS = [
  "payments",
  "reminders",
  "freeWindow",
  "thanks",
  "cancel",
] as const;

export type SoftFaqId = (typeof SOFT_FAQ_IDS)[number];

const FAQ_ID_SET = new Set<string>(SOFT_FAQ_IDS);

export function softFaqIds(): SoftFaqId[] {
  return [...SOFT_FAQ_IDS];
}

export function isSoftFaqId(value: string): value is SoftFaqId {
  return FAQ_ID_SET.has(value);
}

/** One answer at a time. Choosing the open question closes it. */
export function toggleSoftFaq(current: SoftFaqId | null, next: string): SoftFaqId | null {
  if (!isSoftFaqId(next)) return current;
  return current === next ? null : next;
}
