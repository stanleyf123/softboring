import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import type { Review } from "@/lib/review-types";

export type HistoryReview = Review & { locked: boolean };

export function withHistoryAccess(
  reviews: Review[],
  softPlus: boolean,
): HistoryReview[] {
  if (softPlus) {
    return reviews.map((review) => ({ ...review, locked: false }));
  }

  return reviews.map((review, index) => {
    if (index < FREE_HISTORY_LIMIT) {
      return { ...review, locked: false };
    }
    return {
      id: review.id,
      createdAt: review.createdAt,
      energy: "",
      drain: "",
      lessOf: "",
      priorities: "",
      feeling: null,
      summary: "",
      customAnswers: [],
      softTags: [],
      locked: true,
    };
  });
}

export function isHistoryIndexUnlocked(indexFromNewest: number, softPlus: boolean) {
  return softPlus || indexFromNewest < FREE_HISTORY_LIMIT;
}
