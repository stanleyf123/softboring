import { FREE_HISTORY_LIMIT } from "./plan.ts";

/**
 * How many of your own notes may sit raised above the others.
 * Free cannot call the pin endpoint. Soft+ can, and pinning one note
 * lowers the rest — the raised limit is one, already coded.
 */
export const FREE_RAISED_PIN_LIMIT = 0;
export const SOFT_PLUS_RAISED_PIN_LIMIT = 1;

/** Weeks History keeps open to share. Soft+ is unbounded. */
export function shareWindowLimit(softPlus: boolean): number | null {
  return softPlus ? null : FREE_HISTORY_LIMIT;
}

export function raisedPinLimit(softPlus: boolean) {
  return softPlus ? SOFT_PLUS_RAISED_PIN_LIMIT : FREE_RAISED_PIN_LIMIT;
}

/** Soft+ may share a wider history, and may raise a note. Free may share the open window only. */
export function softPlusPinWindowIsHigher() {
  return (
    shareWindowLimit(true) == null &&
    (shareWindowLimit(false) ?? 0) > 0 &&
    raisedPinLimit(true) > raisedPinLimit(false)
  );
}
