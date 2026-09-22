/** Free starter lines for a weekly review. They never overwrite words already written. */

export const SOFT_TEMPLATE_IDS = ["quiet", "tender", "small", "restart", "full"] as const;

export type SoftTemplateId = (typeof SOFT_TEMPLATE_IDS)[number];

export const SOFT_TEMPLATE_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "summary",
] as const;

export type SoftTemplateField = (typeof SOFT_TEMPLATE_FIELDS)[number];

export type SoftTemplateLines = Record<SoftTemplateField, string>;

export type TemplateInsertNote = "filled" | "partial" | "kept";

export function isSoftTemplateId(value: string): value is SoftTemplateId {
  return (SOFT_TEMPLATE_IDS as readonly string[]).includes(value);
}

export type TemplateApplyResult = {
  answers: Record<SoftTemplateField, string>;
  filled: SoftTemplateField[];
  kept: SoftTemplateField[];
};

/** Slip starter lines into blank fields only. Existing words stay as written. */
export function applySoftTemplate(
  current: Partial<Record<SoftTemplateField, string>> | null | undefined,
  lines: Partial<SoftTemplateLines> | null | undefined,
): TemplateApplyResult {
  const source = current ?? {};
  const starters = lines ?? {};
  const answers = {} as Record<SoftTemplateField, string>;
  const filled: SoftTemplateField[] = [];
  const kept: SoftTemplateField[] = [];

  for (const field of SOFT_TEMPLATE_FIELDS) {
    const existing = source[field] ?? "";
    if (existing.trim()) {
      answers[field] = existing;
      kept.push(field);
      continue;
    }
    const line = (starters[field] ?? "").trim();
    if (!line) {
      answers[field] = existing;
      continue;
    }
    answers[field] = line;
    filled.push(field);
  }

  return { answers, filled, kept };
}

export function templateInsertNote(filledCount: number, keptCount: number): TemplateInsertNote {
  if (filledCount <= 0) return "kept";
  if (keptCount > 0) return "partial";
  return "filled";
}
