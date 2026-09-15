import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/lib/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";

const SAMPLE_QUESTIONS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "feeling",
  "summary",
] as const;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Home");
  const tQuestions = await getTranslations("Questions");

  return (
    <div className="pt-6">
      <p className="font-display italic text-muted">{t("eyebrow")}</p>
      <h1 className="mt-4 max-w-xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <Link
        href="/review"
        className="mt-10 inline-flex rounded-full bg-accent px-6 py-3 text-paper"
      >
        {t("cta")}
      </Link>

      <section className="mt-20 max-w-lg">
        <h2 className="font-display text-2xl tracking-tight">{t("ideaTitle")}</h2>
        <p className="mt-4 leading-relaxed text-muted">{t("ideaBody")}</p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl tracking-tight">
          {t("questionsTitle")}
        </h2>
        <ol className="mt-6 space-y-4">
          {SAMPLE_QUESTIONS.map((key, index) => (
            <li key={key} className="flex gap-4 rounded-[1.5rem] bg-paper px-5 py-4">
              <span className="w-6 shrink-0 text-sm text-muted">{index + 1}</span>
              <span className="leading-relaxed">{tQuestions(key)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 max-w-lg">
        <h2 className="font-display text-2xl tracking-tight">{t("pricingTitle")}</h2>
        <p className="mt-4 leading-relaxed text-muted">{t("pricingFree")}</p>
        <p className="mt-2 leading-relaxed text-muted">{t("pricingPaid")}</p>
        <p className="mt-4 text-sm text-muted">{t("pricingNote")}</p>
      </section>
    </div>
  );
}
