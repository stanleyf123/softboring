/** In-app Soft Boring tips — calm, rotating copy. No email. */
export const SOFT_TIP_IDS = [
  "tipPause",
  "tipOneSentence",
  "tipFeeling",
  "tipWallSave",
  "tipNoScore",
  "tipTea",
  "tipSkip",
  "tipNeighbor",
] as const;

export type SoftTipId = (typeof SOFT_TIP_IDS)[number];

/** Stable tip for a calendar day (UTC), so Soft+ desks feel quiet and consistent. */
export function softTipIdForDate(date: Date = new Date()): SoftTipId {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  const index = ((day % SOFT_TIP_IDS.length) + SOFT_TIP_IDS.length) % SOFT_TIP_IDS.length;
  return SOFT_TIP_IDS[index];
}

export function softTipIdAt(index: number): SoftTipId {
  const i = ((index % SOFT_TIP_IDS.length) + SOFT_TIP_IDS.length) % SOFT_TIP_IDS.length;
  return SOFT_TIP_IDS[i];
}
