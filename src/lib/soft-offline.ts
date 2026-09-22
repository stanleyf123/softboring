/** Local online/offline banner. No network calls, no account. */

export const BACK_ONLINE_MS = 4200;

export type OfflineBannerPhase = "hidden" | "offline" | "back";

/** First look after hydration. Online stays quiet; offline speaks at once. */
export function initialOfflinePhase(online: boolean): OfflineBannerPhase {
  return online ? "hidden" : "offline";
}

/**
 * Offline always shows the offline line.
 * Coming back from offline becomes a short "back" note.
 * An online event while already hidden stays hidden — no flash on a normal visit.
 */
export function nextOfflinePhase(
  current: OfflineBannerPhase,
  online: boolean,
): OfflineBannerPhase {
  if (!online) return "offline";
  if (current === "offline" || current === "back") return "back";
  return "hidden";
}

export function offlineBannerMotion(reducedMotion: boolean): "still" | "move" {
  return reducedMotion ? "still" : "move";
}
