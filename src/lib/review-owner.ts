import { getReviewAccess } from "@/lib/review-access";
import type { ReviewOwner } from "@/db/reviews";

export async function getReviewOwner(): Promise<ReviewOwner> {
  const access = await getReviewAccess();
  return access.owner;
}
