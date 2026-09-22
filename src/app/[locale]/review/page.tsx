import { ReviewForm } from "@/components/review-form";
import { SoftNoteCard } from "@/components/soft-note-card";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { isSoftPlusPlan } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
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
    title: t("reviewTitle"),
    description: t("reviewDescription"),
    path: "/review",
  });
}

export default async function ReviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Review");
  const user = await getCurrentUser();
  const softPlus = Boolean(user && isSoftPlusPlan(user.plan, user.planStatus));
  const customQuestions = user && softPlus ? ensureUserSettings(user.id).customQuestions : [];

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-8">
        <SoftNoteCard signedIn={Boolean(user)} />
      </div>
      <div className="mt-10">
        <ReviewForm
          signedIn={Boolean(user)}
          softPlus={softPlus}
          customQuestions={customQuestions}
        />
      </div>
    </div>
  );
}
