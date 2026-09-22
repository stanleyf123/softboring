import { LegalPage } from "@/components/legal-page";
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
    title: t("guidelinesTitle"),
    description: t("guidelinesDescription"),
    path: "/guidelines",
  });
}

export default async function GuidelinesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  return <LegalPage namespace="Guidelines" />;
}
