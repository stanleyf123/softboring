import { redirect } from "@/i18n/navigation";
import { normalizeInviteCode } from "@/lib/invite";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("registerTitle"),
    description: t("registerDescription"),
    path: "/register",
    noIndex: true,
  });
}

export default async function InviteCodePage({ params }: Props) {
  const { locale, code } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);
  const invite = normalizeInviteCode(code);
  if (!invite) {
    redirect({ href: "/register", locale: appLocale });
    return;
  }
  redirect({
    href: { pathname: "/register", query: { invite } },
    locale: appLocale,
  });
}
