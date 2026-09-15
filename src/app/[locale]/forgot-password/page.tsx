import { AuthPageShell } from "@/components/auth-page-shell";
import { ForgotPasswordForm } from "@/components/password-reset-forms";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

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
