import { Link } from "@/i18n/navigation";
import type { SoftActivityItem } from "@/lib/soft-activity";
import { getFormatter, getTranslations } from "next-intl/server";

export async function SoftActivityTimeline({ items }: { items: SoftActivityItem[] }) {
  const t = await getTranslations("SoftActivity");
  const format = await getFormatter();

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] bg-cream px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("emptyTitle")}</h2>
        <p className="mt-3 max-w-md leading-relaxed text-muted">{t("emptyBody")}</p>
        <Link
          href="/review"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("emptyCta")}
        </Link>
      </section>
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
