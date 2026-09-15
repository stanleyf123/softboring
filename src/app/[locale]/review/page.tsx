import { ReviewForm } from "@/components/review-form";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ReviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Review");
  const user = await getCurrentUser();

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        <ReviewForm signedIn={Boolean(user)} />
      </div>
    </div>
  );
}
