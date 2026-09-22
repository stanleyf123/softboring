import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";

/** Three gentle marks. Order is stable for the review checklist. */
export const SOFT_REFLECTION_ITEMS = ["noticed", "unfinished", "kind"] as const;

export type SoftReflectionItem = (typeof SOFT_REFLECTION_ITEMS)[number];

export type SoftReflectionChecks = Record<SoftReflectionItem, boolean>;

export const EMPTY_SOFT_REFLECTION: SoftReflectionChecks = {
  noticed: false,
  unfinished: false,
  kind: false,
};

export function reflectionWeekKey(date: Date, timeZone?: string | null) {
  return isoWeekKeyInTimeZone(date, timeZone);
}

export function emptySoftReflection(): SoftReflectionChecks {
  return { ...EMPTY_SOFT_REFLECTION };
}

/** Require every item to be a real boolean. Partial or stringly payloads are refused. */
export function parseSoftReflectionChecks(value: unknown): SoftReflectionChecks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const next = emptySoftReflection();
  for (const item of SOFT_REFLECTION_ITEMS) {
    if (typeof raw[item] !== "boolean") return null;
    next[item] = raw[item];
  }
  return next;
}

export function parseSoftReflectionPayload(value: unknown): SoftReflectionChecks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return parseSoftReflectionChecks((value as { checks?: unknown }).checks);
}

export function reflectionCheckedCount(checks: SoftReflectionChecks) {
  return SOFT_REFLECTION_ITEMS.filter((item) => checks[item]).length;
}

export function reflectionFlag(checked: boolean) {
  return checked ? 1 : 0;
}
