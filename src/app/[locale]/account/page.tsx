import { AccountPanel } from "@/components/account-panel";
import { countReviewsForUser } from "@/db/reviews";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: appLocale });
    return;
  }

  const t = await getTranslations("Account");
  const reviewCount = countReviewsForUser(user.id);

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10 max-w-lg">
        <AccountPanel
          email={user.email}
          createdAt={user.createdAt}
          reviewCount={reviewCount}
        />
      </div>
    </div>
  );
}
