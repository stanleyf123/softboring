import type { SoftActivityItem } from "@/lib/soft-activity";

export const ACTIVITY_EXPORT_KIND = "softboring-activity";
export const ACTIVITY_EXPORT_FILENAME = "soft-boring-activity.json";

export type ActivityExportItem = {
  id: string;
  kind: SoftActivityItem["kind"];
  createdAt: string;
  excerpt: string;
  href: string;
};

export function activityExportPayload(items: SoftActivityItem[], exportedAt: string) {
  const exported: ActivityExportItem[] = items.map((item) => ({
    id: item.id,
    kind: item.kind,
    createdAt: item.createdAt,
    excerpt: item.excerpt,
    href: item.href,
  }));
  return {
    kind: ACTIVITY_EXPORT_KIND,
    exportedAt,
    plan: "soft_plus" as const,
    count: exported.length,
    items: exported,
  };
}

export function activityExportBody(items: SoftActivityItem[], exportedAt: string) {
  return `${JSON.stringify(activityExportPayload(items, exportedAt), null, 2)}\n`;
}
