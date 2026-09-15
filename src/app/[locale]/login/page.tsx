import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/account", locale: assertLocale(locale) });
  }

  const t = await getTranslations("Auth");
  const { next } = await searchParams;

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("loginTitle")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
        {t("loginLead")}
      </p>
      <div className="mt-10 max-w-md">
        <AuthForm mode="login" nextPath={next} />
      </div>
    </div>
  );
}
