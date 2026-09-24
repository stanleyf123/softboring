import {
  pastSoftIntentions,
  type SoftIntentionHistoryItem,
} from "@/lib/soft-intention-history";

export const INTENTION_EXPORT_KIND = "softboring-intentions";
export const INTENTION_EXPORT_FILENAME = "soft-boring-intentions.json";

export type IntentionExportSource = {
  id: string;
  weekKey: string;
  body: string;
  updatedAt: string;
};

export type IntentionExportItem = SoftIntentionHistoryItem;

/**
 * The same earlier weeks the Soft+ list shows. The current week stays on the
 * intention card, and empty sentences stay out of the file.
 */
export function intentionExportItems(
  rows: readonly IntentionExportSource[],
  currentWeekKey: string,
): IntentionExportItem[] {
  return pastSoftIntentions(rows, currentWeekKey).map((item) => ({
    id: item.id,
    weekKey: item.weekKey,
    body: item.body,
    updatedAt: item.updatedAt,
  }));
}

export function intentionExportPayload(
  rows: readonly IntentionExportSource[],
  currentWeekKey: string,
  exportedAt: string,
) {
  const items = intentionExportItems(rows, currentWeekKey);
  return {
    kind: INTENTION_EXPORT_KIND,
    exportedAt,
    plan: "soft_plus" as const,
    count: items.length,
    items,
  };
}

export function intentionExportBody(
  rows: readonly IntentionExportSource[],
  currentWeekKey: string,
  exportedAt: string,
) {
  return `${JSON.stringify(intentionExportPayload(rows, currentWeekKey, exportedAt), null, 2)}\n`;
}
