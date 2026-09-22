import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

function weekdayName(
  t: Awaited<ReturnType<typeof getTranslations<"Account">>>,
  day: number,
) {
  switch (day) {
    case 1:
      return t("weekday.1");
    case 2:
      return t("weekday.2");
    case 3:
      return t("weekday.3");
    case 4:
      return t("weekday.4");
    case 5:
      return t("weekday.5");
    case 6:
      return t("weekday.6");
    default:
      return t("weekday.0");
  }
}

export async function SoftRhythmCard({
  reminderWeekday,
  reminderEnabled,
  timezone,
}: {
  reminderWeekday: number;
  reminderEnabled: boolean;
  timezone: string;
}) {
  const t = await getTranslations("SoftRhythm");
  const tAccount = await getTranslations("Account");
  const weekday = weekdayName(tAccount, reminderWeekday);
  const nudge = reminderEnabled
    ? t("nudgeOn", { weekday, timezone })
    : t("nudgeOff", { weekday, timezone });

  return (
    <section
      className="rounded-[1.75rem] bg-cream/90 px-5 py-5 shadow-card sm:px-6"
      aria-labelledby="soft-rhythm-title"
      data-soft-rhythm
    >
      <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
      <h2 id="soft-rhythm-title" className="mt-1 font-display text-2xl tracking-tight">
        {t("title")}
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.1rem] bg-paper/80 px-4 py-3">
          <dt className="text-xs text-muted">{t("weekdayLabel")}</dt>
          <dd className="mt-1 font-display text-xl tracking-tight">{weekday}</dd>
        </div>
        <div className="rounded-[1.1rem] bg-blush/60 px-4 py-3">
          <dt className="text-xs text-muted">{t("timezoneLabel")}</dt>
          <dd className="mt-1 font-display text-xl tracking-tight">{timezone}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">{nudge}</p>
      <Link
        href="/account"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
      >
        {t("settingsCta")}
      </Link>
    </section>
  );
}
