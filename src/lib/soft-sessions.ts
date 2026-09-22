/** How recently the newest open session was created. Never a clock time. */
export type SoftSessionRecency = "today" | "thisWeek" | "earlier";

export type OpenSessionSummary = {
  count: number;
  newestCreatedAt: string | null;
};

export type SoftSessionView =
  | { mode: "count"; count: number; recency: SoftSessionRecency }
  | { mode: "tip" };

const DAY_MS = 24 * 60 * 60 * 1000;

export function softSessionRecency(createdAt: string, now: Date): SoftSessionRecency {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return "earlier";
  const age = now.getTime() - created;
  if (age < DAY_MS) return "today";
  if (age < 7 * DAY_MS) return "thisWeek";
  return "earlier";
}

/**
 * Count mode only when the sessions table answered with at least one open desk.
 * Otherwise the account page keeps a devices tip and invents nothing.
 */
export function presentSoftSessions(
  summary: OpenSessionSummary | null,
  now: Date,
): SoftSessionView {
  if (!summary || summary.count < 1 || !summary.newestCreatedAt) {
    return { mode: "tip" };
  }
  return {
    mode: "count",
    count: summary.count,
    recency: softSessionRecency(summary.newestCreatedAt, now),
  };
}
