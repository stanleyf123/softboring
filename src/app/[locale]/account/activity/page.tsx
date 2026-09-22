import { SoftActivityTimeline } from "@/components/soft-activity-timeline";
import { listOwnSoftActivity } from "@/db/soft-activity";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { Link, redirect } from "@/i18n/navigation";
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
    title: t("activityTitle"),
    description: t("activityDescription"),
    path: "/account/activity",
    noIndex: true,
  });
}

export default async function SoftActivityPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: appLocale });
    return;
  }

  const t = await getTranslations("SoftActivity");
  const items = listOwnSoftActivity(user.id);

  return (
    <div className="pt-6">
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10 max-w-2xl space-y-6">
        <SoftActivityTimeline items={items} />
        <Link
          href="/account"
          className="inline-flex rounded-full border border-line px-5 py-2.5 text-sm text-muted"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
