import { getCurrentUser } from "@/lib/auth";
import { getOrCreateGuestId } from "@/lib/guest";
import type { ReviewOwner } from "@/db/reviews";
import type { PublicUser } from "@/db/users";
import { userIsSoftPlus } from "@/lib/plan";

export type ReviewAccess = {
  owner: ReviewOwner;
  user: PublicUser | null;
  isGuest: boolean;
  softPlus: boolean;
};

export async function getReviewAccess(): Promise<ReviewAccess> {
  const guestId = await getOrCreateGuestId();
  const user = await getCurrentUser();
  if (user) {
    return {
      owner: { kind: "user", userId: user.id, guestId },
      user,
      isGuest: false,
      softPlus: userIsSoftPlus(user),
    };
  }
  return {
    owner: { kind: "guest", guestId },
    user: null,
    isGuest: true,
    softPlus: false,
  };
}

export function accessPayload(
  access: Pick<ReviewAccess, "isGuest" | "softPlus" | "user">,
  totalCount: number,
  lockedCount: number,
) {
  return {
    isGuest: access.isGuest,
    softPlus: access.softPlus,
    plan: access.softPlus ? "soft_plus" : "free",
    email: access.user?.email ?? null,
    totalCount,
    lockedCount,
    visibleLimit: access.softPlus ? null : 4,
  };
}
