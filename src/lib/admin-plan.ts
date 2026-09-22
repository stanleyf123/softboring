import { updateUserBilling } from "@/db/users";
import { PLAN_FREE, PLAN_SOFT_PLUS, type PlanId } from "@/lib/plan";

export function applyAdminPlanChange(
  userId: string,
  plan: PlanId,
  clearStripeIds = false,
) {
  if (plan === PLAN_SOFT_PLUS) {
    return updateUserBilling(userId, {
      plan: PLAN_SOFT_PLUS,
      planStatus: "active",
      planExpiresAt: null,
    });
  }
  return updateUserBilling(userId, {
    plan: PLAN_FREE,
    planStatus: "canceled",
    planExpiresAt: null,
    ...(clearStripeIds
      ? {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
        }
      : {}),
  });
}
