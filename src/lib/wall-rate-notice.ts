type Listener = () => void;

const listeners = new Set<Listener>();

/** Wall routes answer a busy minute with HTTP 429 or `rate_limited`. */
export function isWallRateLimited(status: number, error?: unknown) {
  return status === 429 || error === "rate_limited";
}

export function subscribeWallRateToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ask the cream toast to open. Safe to call where no listener is mounted. */
export function showWallRateToast() {
  for (const listener of listeners) listener();
}

/**
 * When a wall response is rate-limited, open the cream toast and return true
 * so the caller can skip a sharp inline error.
 */
export function noticeWallRateLimit(status: number, error?: unknown) {
  if (!isWallRateLimited(status, error)) return false;
  showWallRateToast();
  return true;
}
