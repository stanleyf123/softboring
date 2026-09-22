import {
  MAX_CUSTOM_QUESTIONS,
  type CustomQuestion,
} from "@/lib/custom-questions";

export const SEASONAL_PACK_IDS = [
  "spring-soft-reset",
  "rainy-week-comfort",
  "year-end-gratitude",
] as const;

export type SeasonalPackId = (typeof SEASONAL_PACK_IDS)[number];

export const SEASONAL_PROMPT_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "feeling",
  "summary",
] as const;

export type SeasonalPromptField = (typeof SEASONAL_PROMPT_FIELDS)[number];

/** First three fields become Soft+ custom questions when a pack is applied. */
export const SEASONAL_CUSTOM_FIELDS = ["energy", "drain", "lessOf"] as const;

export function isSeasonalPackId(value: unknown): value is SeasonalPackId {
  return (
    typeof value === "string" &&
    (SEASONAL_PACK_IDS as readonly string[]).includes(value)
  );
}

export function customQuestionsFromPack(
  packId: SeasonalPackId,
  prompts: readonly string[],
): CustomQuestion[] {
  return prompts
    .map((prompt, index) => ({
      id: `seasonal:${packId}:${index + 1}`,
      prompt: prompt.trim().slice(0, 200),
    }))
    .filter((item) => item.prompt)
    .slice(0, MAX_CUSTOM_QUESTIONS);
}
