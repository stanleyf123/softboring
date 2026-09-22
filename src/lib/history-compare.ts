import type { Review } from "@/lib/review-types";

export type CompareField = "feeling" | "energy" | "drain" | "summary";

export type CompareSide = {
  id: string;
  createdAt: string;
  feeling: number | null;
  energy: string;
  drain: string;
  summary: string;
};

export function toCompareSide(
  review: Pick<Review, "id" | "createdAt" | "feeling" | "energy" | "drain" | "summary">,
): CompareSide {
  return {
    id: review.id,
    createdAt: review.createdAt,
    feeling: review.feeling,
    energy: review.energy?.trim() || "",
    drain: review.drain?.trim() || "",
    summary: review.summary?.trim() || "",
  };
}

export function feelingDelta(left: number | null, right: number | null) {
  if (left == null || right == null) return null;
  return right - left;
}

export function canComparePair(leftId: string | null, rightId: string | null) {
  if (!leftId || !rightId) return false;
  return leftId !== rightId;
}

export function excerptForCompare(text: string, max = 280) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const chars = Array.from(trimmed);
  if (chars.length <= max) return trimmed;
  return `${chars.slice(0, max - 1).join("")}…`;
}

export type CompareCardWash = "cream" | "blush";

export function compareCardWash(side: "left" | "right"): CompareCardWash {
  return side === "left" ? "cream" : "blush";
}

/** Five soft marks. Missing or out-of-range feelings stay blank — never a score. */
export function feelingMarks(feeling: number | null): Array<"on" | "off"> {
  const value =
    typeof feeling === "number" && feeling >= 1 && feeling <= 5 ? Math.round(feeling) : null;
  return [1, 2, 3, 4, 5].map((step) => (value != null && step <= value ? "on" : "off"));
}

export type FieldPresence = "both" | "left" | "right" | "neither";

export function fieldPresence(left: string | null | undefined, right: string | null | undefined): FieldPresence {
  const hasLeft = Boolean(left?.trim());
  const hasRight = Boolean(right?.trim());
  if (hasLeft && hasRight) return "both";
  if (hasLeft) return "left";
  if (hasRight) return "right";
  return "neither";
}

export type CompareBridgeTone = "same" | "up" | "down" | "missing" | "waiting";

export function compareBridge(delta: number | null, ready: boolean): CompareBridgeTone {
  if (!ready) return "waiting";
  if (delta == null) return "missing";
  if (delta === 0) return "same";
  return delta > 0 ? "up" : "down";
}
