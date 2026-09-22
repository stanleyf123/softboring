import { SoftMonthView } from "@/components/soft-month-view";
import { listReviewsForOwner } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { isSoftPlusPlan } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { buildSoftMonthSnapshot } from "@/lib/soft-month";
import { redirect } from "@/i18n/navigation";
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
    title: t("snapshotTitle"),
    description: t("snapshotDescription"),
    path: "/account/snapshot",
    noIndex: true,
  });
}

export default async function SoftMonthSnapshotPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: appLocale });
    return;
  }

  const settings = ensureUserSettings(user.id);
  const softPlus = isSoftPlusPlan(user.plan, user.planStatus);
  const reviews = listReviewsForOwner({
    kind: "user",
    userId: user.id,
    guestId: "",
  });
  const snapshot = buildSoftMonthSnapshot(reviews, {
    timeZone: settings.timezone,
    softPlus,
  });

  return (
    <div className="pt-6 print:pt-0">
      <SoftMonthView snapshot={snapshot} />
    </div>
  );
}
