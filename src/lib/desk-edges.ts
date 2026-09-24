/** Anchors for the two quiet ways off the busy part of the desk. */
export const WEEK_PAUSE_ANCHOR = "week-pause";
export const LEAVE_DESK_ANCHOR = "leave-desk";

export type DeskEdge = "pause" | "leave";

export function weekPausePath() {
  return `/review#${WEEK_PAUSE_ANCHOR}`;
}

export function leaveDeskPath() {
  return `/account#${LEAVE_DESK_ANCHOR}`;
}

/**
 * Guests can find the pause card (it asks them to log in).
 * Leaving the desk only exists once there is an account.
 */
export function deskEdgeLinks(signedIn: boolean): DeskEdge[] {
  return signedIn ? ["pause", "leave"] : ["pause"];
}
