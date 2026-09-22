import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import type { SoftActivityItem } from "@/lib/soft-activity";
import { getFormatter, getTranslations } from "next-intl/server";

export async function SoftActivityTimeline({ items }: { items: SoftActivityItem[] }) {
  const t = await getTranslations("SoftActivity");
  const format = await getFormatter();

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("emptyBody")}
        ctaHref="/review"
        ctaLabel={t("emptyCta")}
        wash="bg-cream"
        illustration="activity"
        whisper={t("emptyWhisper")}
      />
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const when = format.dateTime(new Date(item.createdAt), {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return (
          <li key={item.id} className="rounded-[1.5rem] bg-paper px-5 py-4 shadow-card">
            <p className="text-xs text-muted">{when}</p>
            <p className="mt-1 font-display text-lg tracking-tight">{t(`kind_${item.kind}`)}</p>
            {item.excerpt ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.excerpt}</p>
            ) : item.kind === "thanks" ? null : (
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("untitled")}</p>
            )}
            <Link href={item.href} className="mt-3 inline-flex text-sm text-accent">
              {t("open")}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
