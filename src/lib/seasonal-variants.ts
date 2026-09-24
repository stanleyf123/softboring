export const SEASONAL_VARIANT_IDS = ["spring", "summer", "autumn", "winter"] as const;

export type SeasonalVariantId = (typeof SEASONAL_VARIANT_IDS)[number];

export const SEASONAL_VARIANT_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "feeling",
  "summary",
] as const;

export type SeasonalVariantField = (typeof SEASONAL_VARIANT_FIELDS)[number];

export function isSeasonalVariantId(value: unknown): value is SeasonalVariantId {
  return (
    typeof value === "string" &&
    (SEASONAL_VARIANT_IDS as readonly string[]).includes(value)
  );
}

/**
 * Calendar month 1–12. March–May spring, June–August summer,
 * September–November autumn, December–February winter.
 * This only chooses phrasing. It does not change saved fields.
 */
export function seasonForMonth(month: number): SeasonalVariantId | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
