export const QUIET_WRITING_STORAGE_KEY = "softboring.quietWriting.v1";
export const QUIET_WRITING_EVENT = "softboring:quiet-writing";
export const QUIET_WRITING_ATTR = "data-quiet-writing";

export function readQuietWriting(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(QUIET_WRITING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeQuietWriting(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) {
      window.sessionStorage.setItem(QUIET_WRITING_STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(QUIET_WRITING_STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private mode.
  }
  applyQuietWritingDom(on);
  window.dispatchEvent(
    new CustomEvent(QUIET_WRITING_EVENT, { detail: { on } }),
  );
}

export function applyQuietWritingDom(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) {
    document.documentElement.setAttribute(QUIET_WRITING_ATTR, "1");
  } else {
    document.documentElement.removeAttribute(QUIET_WRITING_ATTR);
  }
}
