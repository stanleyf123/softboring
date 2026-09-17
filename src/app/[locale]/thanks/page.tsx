import { ThanksView } from "@/components/thanks-view";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
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
    title: t("thanksTitle"),
    description: t("thanksDescription"),
    path: "/thanks",
  });
}

export default async function ThanksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations("Thanks");
  const user = await getCurrentUser();

  return (
    <ThanksView
      kicker={t("campaignKicker")}
      title={t("campaignTitle")}
      body={t("campaignBody")}
      doodle="tea"
      nextHeading={t("nextHeading")}
      steps={[
        {
          href: "/review",
          title: t("stepReviewTitle"),
          body: t("stepReviewBody"),
          cta: t("campaignCta"),
        },
        {
          href: "/wall",
          title: t("stepWallTitle"),
          body: t("stepWallBody"),
          cta: t("stepWallCta"),
        },
        {
          href: user ? "/account" : "/register",
          title: user ? t("stepNicknameTitle") : t("stepRegisterTitle"),
          body: user ? t("stepNicknameBody") : t("stepRegisterBody"),
          cta: user ? t("stepNicknameCta") : t("campaignRegister"),
        },
      ]}
      extra={
        user ? null : (
          <p className="mt-10 text-sm text-muted">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-accent hover:text-foreground">
              {t("loginCta")}
            </Link>
          </p>
        )
      }
    />
  );
}
