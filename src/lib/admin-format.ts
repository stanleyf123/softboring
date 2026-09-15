import { PLAN_FREE, PLAN_SOFT_PLUS, displayPlan, type PlanId } from "@/lib/plan";
import { formatOneTimeCents } from "@/lib/stripe";

export function formatAdminWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en");
}

export function planLabel(plan: string, planStatus: string | null | undefined) {
  return displayPlan(plan, planStatus) === PLAN_SOFT_PLUS ? "Soft+" : "Free";
}

export function formatPaymentAmount(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
) {
  if (amountCents == null) return "—";
  const code = currency?.trim() || "usd";
  try {
    return formatOneTimeCents(amountCents, code);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${code.toUpperCase()}`;
  }
}

export function formatRevenueSummary(
  byCurrency: Array<{ currency: string; count: number; amountCents: number }>,
) {
  if (byCurrency.length === 0) return "—";
  const known = byCurrency.filter((row) => row.currency && row.currency !== "unknown");
  if (known.length === 0) return "—";
  return known
    .map((row) => formatPaymentAmount(row.amountCents, row.currency))
    .join(" · ");
}

export function asPlanId(value: unknown): PlanId | null {
  if (value === PLAN_FREE || value === PLAN_SOFT_PLUS) return value;
  return null;
}
