export const FREE_HISTORY_LIMIT = 4;

export const PLAN_FREE = "free";
export const PLAN_SOFT_PLUS = "soft_plus";

export type PlanId = typeof PLAN_FREE | typeof PLAN_SOFT_PLUS;

const PLUS_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isSoftPlusPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
): boolean {
  if (plan !== PLAN_SOFT_PLUS) return false;
  if (!status) return true;
  return PLUS_STATUSES.has(status);
}

export function planFromStripeStatus(status: string | null | undefined): {
  plan: PlanId;
  planStatus: string;
} {
  const planStatus = status?.trim() || "canceled";
  if (PLUS_STATUSES.has(planStatus)) {
    return { plan: PLAN_SOFT_PLUS, planStatus };
  }
  return { plan: PLAN_FREE, planStatus };
}

export function displayPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
): PlanId {
  return isSoftPlusPlan(plan, status) ? PLAN_SOFT_PLUS : PLAN_FREE;
}
