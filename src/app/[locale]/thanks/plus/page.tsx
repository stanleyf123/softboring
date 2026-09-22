import { SoftThanksHistory } from "@/components/soft-thanks-history";
import { ThanksView } from "@/components/thanks-view";
import { listRecentThanksForUser } from "@/db/wall-thanks";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { userIsSoftPlus } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
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

export default async function PlusThanksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/thanks/plus" } }, locale: appLocale });
    return;
  }

  const { from } = await searchParams;
  const fromGift = from === "gift";
  const t = await getTranslations("Thanks");
  const softPlus = userIsSoftPlus(user);

  const giftNote = softPlus
    ? user.planExpiresAt
      ? t("giftReadyUntil", {
          date: new Intl.DateTimeFormat(appLocale, { dateStyle: "medium" }).format(
            new Date(user.planExpiresAt),
          ),
        })
      : t("giftReadyPermanent")
    : t("plusPending");

  return (
    <ThanksView
      kicker={fromGift ? t("giftKicker") : t("plusKicker")}
      title={fromGift ? t("giftTitle") : t("plusTitle")}
      body={fromGift ? t("giftBody") : t("plusBody")}
      note={fromGift ? giftNote : softPlus ? t("plusReady") : t("plusPending")}
      doodle="hero"
      nextHeading={t("nextHeading")}
      steps={
        fromGift
          ? [
              {
                href: "/wall",
                title: t("stepWallTitle"),
                body: t("stepWallBody"),
                cta: t("plusWallCta"),
              },
              {
                href: "/digest",
                title: t("stepDigestTitle"),
                body: t("stepDigestBody"),
                cta: t("giftDigestCta"),
              },
              {
                href: "/account",
                title: t("stepNicknameTitle"),
                body: t("stepNicknameBody"),
                cta: t("plusAccountCta"),
              },
            ]
          : [
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
            ]
      }
      extra={
        <SoftThanksHistory
          softPlus={softPlus}
          notes={softPlus ? listRecentThanksForUser(user.id) : []}
        />
      }
    />
  );
}
