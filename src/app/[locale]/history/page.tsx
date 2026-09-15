import { HistoryList } from "@/components/history-list";
import { updateUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const user = await getCurrentUser();
  if (user) {
    updateUserSettings(user.id, { onboardingHistorySeen: true });
  }

  const t = await getTranslations("History");

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        <HistoryList />
      </div>
    </div>
  );
}
