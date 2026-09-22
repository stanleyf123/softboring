import { Link } from "@/i18n/navigation";
import {
  digestMonthKey,
  type DigestArchiveMonth,
} from "@/lib/digest-archive";
import { getFormatter, getTranslations } from "next-intl/server";

export async function DigestArchive({
  softPlus,
  months,
  activeKey,
}: {
  softPlus: boolean;
  months: DigestArchiveMonth[];
  activeKey: string | null;
}) {
  const t = await getTranslations("Digest");
  const format = await getFormatter();

  if (!softPlus) {
    return (
      <section
        className="rounded-[1.75rem] bg-peach/50 px-6 py-6 shadow-card"
        data-digest-archive="tease"
        aria-labelledby="digest-archive-title"
      >
        <p className="text-sm text-accent">{t("archiveEyebrow")}</p>
        <h2 id="digest-archive-title" className="mt-1 font-display text-2xl tracking-tight">
          {t("archiveTeaseTitle")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t("archiveTeaseBody")}</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
          <span className="h-8 w-24 rounded-full bg-cream/90" />
          <span className="h-8 w-20 rounded-full bg-blush/60" />
          <span className="h-8 w-16 rounded-full bg-mint/70" />
        </div>
        <Link
          href="/pricing"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("archiveTeaseCta")}
        </Link>
      </section>
    );
  }

  if (months.length === 0) {
    return (
      <section
        className="rounded-[1.75rem] bg-cream/80 px-6 py-6"
        data-digest-archive="empty"
        aria-labelledby="digest-archive-title"
      >
        <p className="text-sm text-accent">{t("archiveEyebrow")}</p>
        <h2 id="digest-archive-title" className="mt-1 font-display text-2xl tracking-tight">
          {t("archiveEmptyTitle")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t("archiveEmpty")}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-paper px-6 py-6 shadow-card"
      data-digest-archive="list"
      aria-labelledby="digest-archive-title"
    >
      <p className="text-sm text-accent">{t("archiveEyebrow")}</p>
      <h2 id="digest-archive-title" className="mt-1 font-display text-2xl tracking-tight">
        {t("archiveTitle")}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t("archiveLead")}</p>
      <ul className="mt-5 space-y-3">
        <li>
          {activeKey ? (
            <Link
              href="/digest"
              className="flex min-h-11 items-center rounded-[1.2rem] bg-cream/70 px-4 py-3 text-sm"
            >
              {t("archiveCurrent")}
            </Link>
          ) : (
            <p
              className="rounded-[1.2rem] bg-mint/50 px-4 py-3 text-sm"
              aria-current="page"
            >
              {t("archiveCurrent")}
            </p>
          )}
        </li>
        {months.map((month) => {
          const key = digestMonthKey(month.year, month.month);
          const label = format.dateTime(new Date(month.year, month.month - 1, 1), {
            month: "long",
            year: "numeric",
          });
          const open = activeKey === key;
          return (
            <li key={key}>
              <Link
                href={{ pathname: "/digest", query: { month: key } }}
                aria-current={open ? "page" : undefined}
                className={`block rounded-[1.2rem] px-4 py-3 ${
                  open ? "bg-peach/70" : "bg-cream/70"
                }`}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-lg tracking-tight">{label}</span>
                  <span className="text-sm text-muted">{t("archiveCount", { count: month.count })}</span>
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {month.avgFeeling == null
                    ? t("archiveFeelingEmpty")
                    : t("archiveFeeling", { value: month.avgFeeling })}
                </span>
                <span className="mt-2 inline-flex min-h-11 items-center text-sm text-accent">
                  {t("archiveOpen")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
