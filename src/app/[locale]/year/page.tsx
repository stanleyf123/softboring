import { CapsuleCalendarHints } from "@/components/capsule-calendar-hints";
import { QuietYearChips } from "@/components/quiet-year-chips";
import { YearPanel } from "@/components/year-panel";
import { listPublicCapsules } from "@/db/soft-capsules";
import { listReviewsForOwner } from "@/db/reviews";
import { listSoftLettersForYear } from "@/db/soft-letters";
import { ensureUserSettings } from "@/db/user-settings";
import { listPauseWeekKeys } from "@/db/week-pauses";
import { buildQuietYearChips } from "@/lib/quiet-chips";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { buildCapsuleDayHints } from "@/lib/capsule-hints";
import { userIsSoftPlus } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { matchLettersToReviews } from "@/lib/soft-letter";
import { softYearForDate } from "@/lib/soft-year";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("yearTitle"),
    description: t("yearDescription"),
    path: "/year",
    noIndex: true,
  });
}

export default async function YearPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const t = await getTranslations("Year");
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);

  const reviews = user
    ? listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" })
    : [];
  const settings = user ? ensureUserSettings(user.id) : null;
  const quietChips =
    user && settings
      ? buildQuietYearChips({
          reviews,
          pauseWeekKeys: listPauseWeekKeys(user.id),
          softPlus,
          timeZone: settings.timezone,
        })
      : null;
  const timeline = user && softPlus ? softYearForDate(reviews) : null;
  const letters =
    user && softPlus && timeline && settings
      ? matchLettersToReviews(
          listSoftLettersForYear(user.id, timeline.year),
          reviews,
          settings.timezone,
        )
      : [];
  const capsuleHints =
    user && softPlus
      ? buildCapsuleDayHints(listPublicCapsules(user.id), settings?.timezone)
      : [];

  return (
    <div className="pt-6">
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10 space-y-6">
        <CapsuleCalendarHints softPlus={softPlus} hints={capsuleHints} />
        {quietChips ? (
          <QuietYearChips
            year={quietChips.year}
            chips={quietChips.chips}
            hiddenCount={quietChips.hiddenCount}
            softPlus={softPlus}
          />
        ) : null}
        {timeline ? (
          <YearPanel timeline={timeline} letters={letters} />
        ) : (
          <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
            <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted">
              {user ? t("lockedBody") : t("signedOutBody")}
            </p>
            <div
              className="mt-8 flex flex-wrap gap-2 opacity-50"
              aria-hidden="true"
            >
              {Array.from({ length: 16 }, (_, index) => (
                <span
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full ${
                    index % 5 === 0
                      ? "bg-mint"
                      : index % 3 === 0
                        ? "bg-peach"
                        : "bg-line/70"
                  }`}
                />
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
              >
                {t("lockedCta")}
              </Link>
              {!user ? (
                <Link
                  href={{ pathname: "/login", query: { next: "/year" } }}
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                >
                  {t("loginCta")}
                </Link>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
