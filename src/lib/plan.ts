export const FREE_HISTORY_LIMIT = 4;

export const PLAN_FREE = "free";
export const PLAN_SOFT_PLUS = "soft_plus";

/** Soft gift Soft+: gentle account reminder when fewer than this many days remain. */
export const PLAN_EXPIRY_REMINDER_DAYS = 7;

export type PlanId = typeof PLAN_FREE | typeof PLAN_SOFT_PLUS;

const PLUS_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SoftPlusUserLike = {
  plan?: string | null;
  planStatus?: string | null;
  planExpiresAt?: string | null;
} | null | undefined;

export function planExpiryPassed(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  return !Number.isNaN(ms) && ms <= Date.now();
}

/** Whole soft days remaining until gift Soft+ ends (null = no temporary expiry). */
export function daysUntilPlanExpiry(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return null;
  const remaining = ms - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

export function planExpiryReminderDue(
  expiresAt: string | null | undefined,
  withinDays = PLAN_EXPIRY_REMINDER_DAYS,
): boolean {
  const days = daysUntilPlanExpiry(expiresAt);
  return days != null && days > 0 && days <= withinDays;
}

export function isSoftPlusPlan(
  plan: string | null | undefined,
  status: string | null | undefined,
  expiresAt?: string | null | undefined,
): boolean {
  if (plan !== PLAN_SOFT_PLUS) return false;
  if (planExpiryPassed(expiresAt)) return false;
  if (!status) return true;
  return PLUS_STATUSES.has(status);
}

/** Prefer this when reading a signed-in user so gift `plan_expires_at` is honored. */
export function userIsSoftPlus(user: SoftPlusUserLike): boolean {
  if (!user) return false;
  return isSoftPlusPlan(user.plan, user.planStatus, user.planExpiresAt);
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
  expiresAt?: string | null | undefined,
): PlanId {
  return isSoftPlusPlan(plan, status, expiresAt) ? PLAN_SOFT_PLUS : PLAN_FREE;
}
