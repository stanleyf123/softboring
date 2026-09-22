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
