import { SampleReviewCard } from "@/components/sample-review-card";
import { HeroDoodle } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("homeTitle"),
    description: t("homeDescription"),
    path: "/",
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Home");

  return (
    <div className="pt-2">
      <section className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <p className="font-display italic text-accent">{t("eyebrow")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li className="rounded-full bg-peach px-3 py-1 text-sm">
              {t("chipOnce")}
            </li>
            <li className="rounded-full bg-mint px-3 py-1 text-sm">
              {t("chipQuestions")}
            </li>
            <li className="rounded-full bg-blush px-3 py-1 text-sm">
              {t("chipNotTodo")}
            </li>
          </ul>
          <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{t("lead")}</p>
          <Link
            href="/review"
            className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-paper shadow-soft"
          >
            {t("cta")}
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[17.5rem] shrink-0 sm:mx-0 sm:max-w-[15.5rem] md:max-w-[17.5rem]">
          <HeroDoodle />
        </div>
      </section>

      <section className="mt-16">
        <p className="font-display text-sm italic text-muted">{t("sampleKicker")}</p>
        <h2 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">
          {t("sampleHeading")}
        </h2>
        <p className="mt-3 max-w-lg leading-relaxed text-muted">
          {t("sampleLead")}
        </p>
        <div className="mt-8">
          <SampleReviewCard />
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        <IdeaCard title={t("ideaOneTitle")} body={t("ideaOneBody")} wash="bg-peach/80" />
        <IdeaCard title={t("ideaTwoTitle")} body={t("ideaTwoBody")} wash="bg-blush/80" />
        <IdeaCard title={t("ideaThreeTitle")} body={t("ideaThreeBody")} wash="bg-mint/80" />
      </section>

      <section className="mt-16 rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <h2 className="font-display text-2xl tracking-tight">{t("pricingTitle")}</h2>
        <p className="mt-4 leading-relaxed text-muted">{t("pricingFree")}</p>
        <p className="mt-2 leading-relaxed text-muted">{t("pricingPaid")}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("pricingCta")}
        </Link>
      </section>

      <section className="mt-14 rounded-[2rem] bg-blush/70 px-6 py-8 text-center shadow-card sm:px-8">
        <h2 className="font-display text-2xl tracking-tight">{t("bottomTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
          {t("bottomBody")}
        </p>
        <Link
          href="/review"
          className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-paper shadow-soft"
        >
          {t("cta")}
        </Link>
      </section>
    </div>
  );
}

function IdeaCard({
  title,
  body,
  wash,
}: {
  title: string;
  body: string;
  wash: string;
}) {
  return (
    <div className={`rounded-[1.75rem] ${wash} px-5 py-6 shadow-card`}>
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
