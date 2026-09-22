import { HistoryList } from "@/components/history-list";
import { SoftLetterArchive } from "@/components/soft-letter-archive";
import { listReviewsForOwner } from "@/db/reviews";
import { listSoftLetters } from "@/db/soft-letters";
import { ensureUserSettings, updateUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
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
  const letters =
    user && softPlus
      ? matchLettersToReviews(
          listSoftLetters(user.id),
          listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" }),
          ensureUserSettings(user.id).timezone,
        )
      : [];

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        {softPlus ? <SoftLetterArchive letters={letters} /> : null}
        <HistoryList />
      </div>
    </div>
  );
}
