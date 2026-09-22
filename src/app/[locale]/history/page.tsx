import { CapsuleCalendarHints } from "@/components/capsule-calendar-hints";
import { HistoryList } from "@/components/history-list";
import { QuietYearChips } from "@/components/quiet-year-chips";
import { SoftLetterArchive } from "@/components/soft-letter-archive";
import { listPublicCapsules } from "@/db/soft-capsules";
import { listReviewsForOwner } from "@/db/reviews";
import { listSoftLetters } from "@/db/soft-letters";
import { ensureUserSettings, updateUserSettings } from "@/db/user-settings";
import { listPauseWeekKeys } from "@/db/week-pauses";
import { buildQuietYearChips } from "@/lib/quiet-chips";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { buildCapsuleDayHints } from "@/lib/capsule-hints";
import { userIsSoftPlus } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { matchLettersToReviews } from "@/lib/soft-letter";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("historyTitle"),
    description: t("historyDescription"),
    path: "/history",
  });
}

export default async function HistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);
  if (user) {
    updateUserSettings(user.id, { onboardingHistorySeen: true });
  }

  const t = await getTranslations("History");
  const reviews = user
    ? listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" })
    : [];
  const settings = user ? ensureUserSettings(user.id) : null;
  const letters =
    user && softPlus && settings
      ? matchLettersToReviews(listSoftLetters(user.id), reviews, settings.timezone)
      : [];
  const quietChips =
    user && settings
      ? buildQuietYearChips({
          reviews,
          pauseWeekKeys: listPauseWeekKeys(user.id),
          softPlus,
          timeZone: settings.timezone,
        })
      : null;
  const capsuleHints =
    user && softPlus
      ? buildCapsuleDayHints(listPublicCapsules(user.id), settings?.timezone)
      : [];

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        <div className="mb-8">
          <CapsuleCalendarHints softPlus={softPlus} hints={capsuleHints} />
        </div>
        {quietChips ? (
          <div className="mb-8">
            <QuietYearChips
              year={quietChips.year}
              chips={quietChips.chips}
              hiddenCount={quietChips.hiddenCount}
              softPlus={softPlus}
            />
          </div>
        ) : null}
        {softPlus ? <SoftLetterArchive letters={letters} /> : null}
        <HistoryList />
      </div>
    </div>
  );
}
