import { ThanksView } from "@/components/thanks-view";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { isSoftPlusPlan } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
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
    title: t("plusThanksTitle"),
    description: t("plusThanksDescription"),
    path: "/thanks/plus",
    noIndex: true,
  });
}

export default async function PlusThanksPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/thanks/plus" } }, locale: appLocale });
    return;
  }

  const t = await getTranslations("Thanks");
  const softPlus = isSoftPlusPlan(user.plan, user.planStatus);

  return (
    <ThanksView
      kicker={t("plusKicker")}
      title={t("plusTitle")}
      body={t("plusBody")}
      note={softPlus ? t("plusReady") : t("plusPending")}
      doodle="hero"
      nextHeading={t("nextHeading")}
      steps={[
        {
          href: "/review",
          title: t("stepReviewTitle"),
          body: t("stepReviewBody"),
          cta: t("plusReviewCta"),
        },
        {
          href: "/wall",
          title: t("stepWallTitle"),
          body: t("stepWallBody"),
          cta: t("plusWallCta"),
        },
        {
          href: "/account",
          title: t("stepNicknameTitle"),
          body: t("stepNicknameBody"),
          cta: t("plusAccountCta"),
        },
      ]}
    />
  );
}
