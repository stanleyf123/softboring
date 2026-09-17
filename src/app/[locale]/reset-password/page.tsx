import { AuthPageShell } from "@/components/auth-page-shell";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("resetTitle"),
    description: t("resetDescription"),
    path: "/reset-password",
    noIndex: true,
  });
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/account", locale: assertLocale(locale) });
  }

  const t = await getTranslations("Auth");
  const { token } = await searchParams;

  return (
    <AuthPageShell title={t("resetTitle")} lead={t("resetLead")} doodle="register">
      <ResetPasswordForm token={token?.trim() ?? ""} />
    </AuthPageShell>
  );
}
