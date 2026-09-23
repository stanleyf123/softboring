import type { SoftReflectionChecks } from "./soft-reflection.ts";

const REFLECTION_ITEMS = ["noticed", "unfinished", "kind"] as const;

const WEEK_KEY = /^\d{4}-W\d{2}$/;

export type ReflectionExportInput = {
  weekKey: string;
  checks: SoftReflectionChecks | unknown;
  updatedAt: string;
};

export type PortableReflection = {
  weekKey: string;
  checks: SoftReflectionChecks;
  updatedAt: string;
};

/** Same boolean contract as parseSoftReflectionChecks, kept local so the JSON download stays free of aliases. */
function checklistOrNull(value: unknown): SoftReflectionChecks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const next: SoftReflectionChecks = { noticed: false, unfinished: false, kind: false };
  for (const item of REFLECTION_ITEMS) {
    if (typeof raw[item] !== "boolean") return null;
    next[item] = raw[item];
  }
  return next;
}

/**
 * Soft+ weekly JSON includes the checklist.
 * Free returns null so the download stays the latest reviews only.
 */
export function portableReflections(
  rows: ReflectionExportInput[] | null | undefined,
  softPlus: boolean,
): PortableReflection[] | null {
  if (!softPlus) return null;
  const clean: PortableReflection[] = [];
  for (const row of rows ?? []) {
    if (!row || typeof row !== "object") continue;
    const weekKey = typeof row.weekKey === "string" ? row.weekKey.trim() : "";
    if (!WEEK_KEY.test(weekKey)) continue;
    const checks = checklistOrNull(row.checks);
    if (!checks) continue;
    const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
    clean.push({ weekKey, checks, updatedAt });
  }
  clean.sort((a, b) => {
    if (a.weekKey !== b.weekKey) return a.weekKey < b.weekKey ? 1 : -1;
    if (a.updatedAt === b.updatedAt) return 0;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
  return clean;
}
