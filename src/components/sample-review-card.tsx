import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  DrainIcon,
  EnergyIcon,
  FeelingIcon,
  LessOfIcon,
  PrioritiesIcon,
  StampFlower,
  SummaryIcon,
} from "./soft-doodles";

const SAMPLE_ITEMS = [
  { key: "energy", Icon: EnergyIcon, tint: "bg-peach/80" },
  { key: "drain", Icon: DrainIcon, tint: "bg-blush/90" },
  { key: "lessOf", Icon: LessOfIcon, tint: "bg-mint/80" },
  { key: "priorities", Icon: PrioritiesIcon, tint: "bg-peach/70" },
] as const;

const SAMPLE_FEELING = 4;

export async function SampleReviewCard() {
  const t = await getTranslations("Home");
  const tQuestions = await getTranslations("Questions");
  const tHistory = await getTranslations("History");

  return (
    <article className="relative overflow-hidden rounded-[2.25rem] border-2 border-dashed border-line bg-paper px-5 py-6 shadow-soft sm:px-8 sm:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center rounded-full bg-blush px-3 py-1 text-xs tracking-wide text-foreground">
            {t("sampleLabel")}
          </p>
          <p className="mt-4 text-sm text-muted">{t("sampleDate")}</p>
          <h3 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">
            {t("sampleTitle")}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {t("sampleIntro")}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-col items-center rounded-2xl border-2 border-line bg-peach px-2.5 py-2 sm:px-3"
          aria-hidden="true"
        >
          <StampFlower />
          <span className="mt-1 font-display text-[10px] tracking-widest text-muted">
            {t("sampleStamp")}
          </span>
        </div>
      </div>

      <ol className="mt-8 grid gap-3 lg:grid-cols-2">
        {SAMPLE_ITEMS.map(({ key, Icon, tint }) => (
          <li
            key={key}
            className={`flex gap-3 rounded-[1.75rem] ${tint} px-4 py-4 sm:gap-4 sm:px-5`}
          >
            <Icon />
            <div className="min-w-0">
              <p className="text-sm text-muted">{tQuestions(key)}</p>
              <p className="mt-1 leading-relaxed">{t(`sampleAnswers.${key}`)}</p>
            </div>
          </li>
        ))}

        <li className="flex gap-3 rounded-[1.75rem] bg-blush/80 px-4 py-4 sm:gap-4 sm:px-5">
          <FeelingIcon />
          <div className="min-w-0">
            <p className="text-sm text-muted">{tQuestions("feeling")}</p>
            <p className="mt-1 leading-relaxed">{t("sampleAnswers.feeling")}</p>
            <p className="mt-2 text-sm text-muted">
              {tHistory("feeling", { value: SAMPLE_FEELING })}
            </p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((value) => (
                <span
                  key={value}
                  className={
                    value <= SAMPLE_FEELING
                      ? "h-2.5 w-2.5 rounded-full bg-accent"
                      : "h-2.5 w-2.5 rounded-full bg-paper"
                  }
                />
              ))}
            </div>
          </div>
        </li>

        <li className="flex gap-3 rounded-[1.75rem] bg-mint/70 px-4 py-4 sm:gap-4 sm:px-5">
          <SummaryIcon />
          <div className="min-w-0">
            <p className="text-sm text-muted">{tQuestions("summary")}</p>
            <p className="mt-1 leading-relaxed">{t("sampleAnswers.summary")}</p>
          </div>
        </li>
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/review"
          className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("sampleCta")}
        </Link>
        <p className="text-sm text-muted">{t("sampleCtaHint")}</p>
      </div>
    </article>
  );
}
