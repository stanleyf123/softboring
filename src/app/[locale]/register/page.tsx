import { AuthForm } from "@/components/auth-form";
import { AuthPageShell } from "@/components/auth-page-shell";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleOAuthConfigured, isLineOAuthConfigured } from "@/lib/oauth-config";
import { normalizeInviteCode } from "@/lib/invite";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string; invite?: string }>;
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
  });
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/account", locale: assertLocale(locale) });
  }

  const t = await getTranslations("Auth");
  const { next, error, invite } = await searchParams;

  return (
    <AuthPageShell title={t("registerTitle")} lead={t("registerLead")} doodle="register">
      <AuthForm
        mode="register"
        nextPath={next}
        inviteCode={normalizeInviteCode(invite)}
        oauth={{ google: isGoogleOAuthConfigured(), line: isLineOAuthConfigured() }}
        oauthError={error}
      />
    </AuthPageShell>
  );
}
