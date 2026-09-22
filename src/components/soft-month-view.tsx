"use client";

import { Link } from "@/i18n/navigation";
import type { SoftMonthSnapshot } from "@/lib/soft-month";
import { useFormatter, useTranslations } from "next-intl";

export function SoftMonthView({ snapshot }: { snapshot: SoftMonthSnapshot }) {
  const t = useTranslations("SoftMonth");
  const tQuestions = useTranslations("Questions");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const monthDate = new Date(Date.UTC(snapshot.year, snapshot.month - 1, 15, 12));
  const monthLabel = format.dateTime(monthDate, {
    month: "long",
    year: "numeric",
    timeZone: snapshot.timeZone,
  });

  return (
    <div className="soft-month-sheet soft-print-sheet rounded-[2rem] bg-[#fff8f2] px-5 py-6 text-[#3f342e] sm:px-8 sm:py-8">
      <div className="print:hidden">
        <p className="text-sm">
          <Link href="/account" className="text-muted hover:text-foreground">
            {t("back")}
          </Link>
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
          >
            {t("print")}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.assign("/api/account/snapshot");
            }}
            className="rounded-full bg-mint px-5 py-2.5 text-sm shadow-card"
          >
            {t("json")}
          </button>
        </div>
      </div>

      <p className="mt-6 font-display text-sm italic text-[#c47f6e] print:mt-0">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-lg text-lg leading-relaxed text-[#8a7468]">{t("lead")}</p>
      <p className="mt-4 font-display text-2xl tracking-tight">{monthLabel}</p>
      <p className="mt-1 text-sm text-[#8a7468]">
        {t("timezoneNote", { timezone: snapshot.timeZone })}
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="soft-print-blush rounded-[1.25rem] bg-[#f4d4c6] px-4 py-3">
          <dt className="text-xs text-[#8a7468]">{t("countLabel")}</dt>
          <dd className="mt-1 font-display text-2xl">{snapshot.monthCount}</dd>
        </div>
        <div className="soft-print-mint rounded-[1.25rem] bg-[#d5e6d8] px-4 py-3">
          <dt className="text-xs text-[#8a7468]">{t("feelingLabel")}</dt>
          <dd className="mt-1 font-display text-2xl">
            {snapshot.avgFeeling == null ? "—" : snapshot.avgFeeling}
          </dd>
        </div>
        <div className="soft-print-cream rounded-[1.25rem] bg-[#fff4e8] px-4 py-3">
          <dt className="text-xs text-[#8a7468]">{t("streakLabel")}</dt>
          <dd className="mt-1 font-display text-2xl">{snapshot.streak}</dd>
        </div>
      </dl>

      {!snapshot.softPlus ? (
        <p className="mt-4 text-sm leading-relaxed text-[#8a7468]">{t("freeHint")}</p>
      ) : null}
      {snapshot.lockedCount > 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-[#8a7468]">
          {t("lockedNote", { count: snapshot.lockedCount })}
        </p>
      ) : null}

      {snapshot.energyKeywords.length > 0 || snapshot.drainKeywords.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <KeywordList title={t("energyTitle")} words={snapshot.energyKeywords} />
          <KeywordList title={t("drainTitle")} words={snapshot.drainKeywords} />
        </div>
      ) : null}

      {snapshot.reviews.length === 0 ? (
        <p className="mt-8 rounded-[1.5rem] bg-white/70 px-5 py-8 text-[#8a7468]">
          {t("empty")}
        </p>
      ) : (
        <ol className="mt-8 space-y-5">
          {snapshot.reviews.map((review) => (
            <li
              key={review.id}
              className="soft-print-card break-inside-avoid rounded-[1.5rem] border border-[#e8d5c8] bg-white/80 px-5 py-5"
            >
              <p className="text-sm text-[#8a7468]">
                {format.dateTime(new Date(review.createdAt), {
                  dateStyle: "long",
                  timeZone: snapshot.timeZone,
                })}
              </p>
              {review.locked ? (
                <>
                  <h2 className="mt-2 font-display text-2xl tracking-tight">
                    {t("lockedCard")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#8a7468]">
                    {t("lockedCardBody")}
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-flex text-sm text-[#c47f6e] print:hidden"
                  >
                    {t("seePlus")}
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="mt-2 font-display text-2xl tracking-tight">
                    {review.summary.trim() || t("untitled")}
                  </h2>
                  <p className="mt-2 text-sm text-[#8a7468]">
                    {review.feeling
                      ? tHistory("feeling", { value: review.feeling })
                      : t("noFeeling")}
                  </p>
                  <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                    {(["energy", "drain", "lessOf", "priorities"] as const).map((field) => (
                      <div key={field}>
                        <dt className="text-[#8a7468]">{tQuestions(field)}</dt>
                        <dd className="mt-1 whitespace-pre-wrap">
                          {review[field].trim() || "—"}
                        </dd>
                      </div>
                    ))}
                    {(review.customAnswers ?? []).map((item) => (
                      <div key={item.id}>
                        <dt className="text-[#8a7468]">{item.prompt}</dt>
                        <dd className="mt-1 whitespace-pre-wrap">
                          {item.answer.trim() || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function KeywordList({
  title,
  words,
}: {
  title: string;
  words: Array<{ word: string; count: number }>;
}) {
  if (words.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-[#8a7468]">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {words.map((chip) => (
          <li
            key={chip.word}
            className="soft-print-cream rounded-full bg-[#fff4e8] px-3 py-1 text-sm"
          >
            {chip.word}
          </li>
        ))}
      </ul>
    </div>
  );
}
