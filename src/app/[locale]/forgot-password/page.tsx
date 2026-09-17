import { AuthPageShell } from "@/components/auth-page-shell";
import { ForgotPasswordForm } from "@/components/password-reset-forms";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
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
    title: t("forgotTitle"),
    description: t("forgotDescription"),
    path: "/forgot-password",
    noIndex: true,
  });
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/account", locale: assertLocale(locale) });
  }

  const t = await getTranslations("Auth");

  return (
    <AuthPageShell title={t("forgotTitle")} lead={t("forgotLead")} doodle="login">
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
