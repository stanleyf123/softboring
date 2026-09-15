import { getCurrentUser } from "@/lib/auth";
import { getOrCreateGuestId } from "@/lib/guest";
import type { ReviewOwner } from "@/db/reviews";

export async function getReviewOwner(): Promise<ReviewOwner> {
  const guestId = await getOrCreateGuestId();
  const user = await getCurrentUser();
  if (user) {
    return { kind: "user", userId: user.id, guestId };
  }
  return { kind: "guest", guestId };
}
