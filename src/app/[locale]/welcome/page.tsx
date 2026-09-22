import { ThanksView } from "@/components/thanks-view";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { safeAppPath } from "@/lib/public-origin";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; invited?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("welcomeTitle"),
    description: t("welcomeDescription"),
    path: "/welcome",
    noIndex: true,
  });
}

export default async function WelcomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);
  const t = await getTranslations("Thanks");
  const user = await getCurrentUser();
  const { next, invited } = await searchParams;
  const continuePath = next ? safeAppPath(next, "") : "";
  const showContinue =
    Boolean(continuePath) &&
    continuePath !== "/welcome" &&
    continuePath !== "/account" &&
    continuePath !== "/";

  return (
    <ThanksView
      kicker={t("welcomeKicker")}
      title={t("welcomeTitle")}
      body={user ? t("welcomeBody") : t("welcomeBodyGuest")}
      note={invited === "1" ? t("invitedNote") : null}
      doodle="envelope"
      nextHeading={t("nextHeading")}
      steps={[
        {
          href: "/review",
          title: t("stepReviewTitle"),
          body: t("stepReviewBody"),
          cta: t("stepReviewCta"),
        },
        {
          href: "/wall",
          title: t("stepWallTitle"),
          body: t("stepWallBody"),
          cta: t("stepWallCta"),
        },
        {
          href: user ? "/account" : "/register",
          title: t("stepNicknameTitle"),
          body: t("stepNicknameBody"),
          cta: user ? t("stepNicknameCta") : t("campaignRegister"),
        },
      ]}
      extra={
        showContinue ? (
          <p className="mt-10">
            <a
              href={`/${appLocale}${continuePath}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted shadow-card hover:text-foreground"
            >
              {t("continue")}
            </a>
          </p>
        ) : null
      }
    />
  );
}
