/** The five written weekly prompts. Feeling is a number, so it is not a dot. */
export const WEEKLY_TEXT_PROMPTS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "summary",
] as const;

export type WeeklyPromptId = (typeof WEEKLY_TEXT_PROMPTS)[number];

export type ReviewPromptDot = {
  id: WeeklyPromptId;
  filled: boolean;
};

/** A prompt has text when something other than space is written. */
export function promptHasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * One quiet dot per written prompt.
 * There is no count, score, or streak — only whether words are there.
 */
export function weeklyPromptDots(
  values: Partial<Record<WeeklyPromptId, unknown>>,
): ReviewPromptDot[] {
  return WEEKLY_TEXT_PROMPTS.map((id) => ({
    id,
    filled: promptHasText(values[id]),
  }));
}
