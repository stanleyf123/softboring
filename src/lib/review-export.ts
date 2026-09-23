import {
  portableReflections,
  type ReflectionExportInput,
} from "./reflection-export.ts";
import type { Review } from "@/lib/review-types";

export const ACCOUNT_EXPORT_KIND = "softboring-reviews";

export type PortableReview = {
  id: string;
  createdAt: string;
  locale: string | null;
  feeling: number | null;
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  summary: string;
  customAnswers: Review["customAnswers"];
  mood: Review["mood"];
  softTags: string[];
};

export function toPortableReview(review: Review): PortableReview {
  return {
    id: review.id,
    createdAt: review.createdAt,
    locale: review.locale ?? null,
    feeling: review.feeling,
    energy: review.energy,
    drain: review.drain,
    lessOf: review.lessOf,
    priorities: review.priorities,
    summary: review.summary,
    customAnswers: review.customAnswers ?? [],
    mood: review.mood ?? null,
    softTags: review.softTags ?? [],
  };
}

export function newestReviews(reviews: Review[]) {
  return [...reviews].sort((a, b) => {
    const left = Date.parse(a.createdAt);
    const right = Date.parse(b.createdAt);
    const aTime = Number.isNaN(left) ? 0 : left;
    const bTime = Number.isNaN(right) ? 0 : right;
    if (bTime !== aTime) return bTime - aTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Newest-first. Free keeps the same open weeks History already shows. */
export function reviewsForAccountDownload(
  reviews: Review[],
  softPlus: boolean,
  freeLimit: number,
) {
  const newest = newestReviews(reviews);
  if (softPlus) return newest;
  return newest.slice(0, freeLimit);
}

export function accountDownloadPayload(
  reviews: Review[],
  softPlus: boolean,
  exportedAt: string,
  freeLimit: number,
  reflections: ReflectionExportInput[] = [],
) {
  const included = reviewsForAccountDownload(reviews, softPlus, freeLimit).map(toPortableReview);
  const payload = {
    kind: ACCOUNT_EXPORT_KIND,
    exportedAt,
    plan: softPlus ? "soft_plus" : "free",
    included: included.length,
    limit: softPlus ? null : freeLimit,
    reviews: included,
  };
  if (!softPlus) return payload;
  return {
    ...payload,
    reflections: portableReflections(reflections, true) ?? [],
  };
}

export function accountDownloadFilename(softPlus: boolean) {
  return softPlus ? "soft-boring-reviews.json" : "soft-boring-latest-four.json";
}

export function accountDownloadBody(
  reviews: Review[],
  softPlus: boolean,
  exportedAt: string,
  freeLimit: number,
  reflections: ReflectionExportInput[] = [],
) {
  return `${JSON.stringify(
    accountDownloadPayload(reviews, softPlus, exportedAt, freeLimit, reflections),
    null,
    2,
  )}\n`;
}
