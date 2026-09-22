"use client";

import { Link } from "@/i18n/navigation";
import type { MonthlySoftReport } from "@/lib/soft-report";
import { useTranslations } from "next-intl";

const TILES = [
  { key: "thanksGiven", label: "thanksLabel", wash: "bg-peach/70" },
  { key: "echoes", label: "echoesLabel", wash: "bg-blush/70" },
  { key: "gratitudesDrawn", label: "drawsLabel", wash: "bg-mint/70" },
  { key: "pauseWeeks", label: "pausesLabel", wash: "bg-cream" },
] as const;

export function SoftReportSection({ report }: { report: MonthlySoftReport }) {
  const t = useTranslations("Digest");

  return (
    <section
      className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8"
      data-soft-report="open"
      aria-labelledby="soft-report-title"
    >
      <p className="font-display italic text-accent">{t("reportEyebrow")}</p>
      <h2 id="soft-report-title" className="mt-2 font-display text-2xl tracking-tight">
        {t("reportTitle")}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        {t("reportLead", { zone: report.timeZone })}
      </p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <div key={tile.key} className={`rounded-[1.4rem] ${tile.wash} px-4 py-4`}>
            <dt className="text-sm text-muted">{t(tile.label)}</dt>
            <dd className="mt-1 font-display text-2xl tracking-tight">
              {t("reportCount", { count: report[tile.key] })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">{t("reportHint")}</p>
    </section>
  );
}

export function SoftReportTease({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Digest");

  return (
    <section
      className="mt-5 rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8"
      data-soft-report="tease"
      aria-labelledby="soft-report-tease-title"
    >
      <p className="font-display italic text-accent">{t("reportEyebrow")}</p>
      <h2 id="soft-report-tease-title" className="mt-2 font-display text-2xl tracking-tight">
        {t("teaseTitle")}
      </h2>
      <p className="mt-3 max-w-lg leading-relaxed text-muted">{t("teaseBody")}</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <div key={tile.key} className={`rounded-[1.4rem] ${tile.wash} px-4 py-4`}>
            <dt className="text-sm text-muted">{t(tile.label)}</dt>
            <dd className="mt-1 font-display text-2xl tracking-tight text-muted">{t("teaseValue")}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
        {!signedIn ? (
          <Link
            href={{ pathname: "/login", query: { next: "/digest" } }}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
          >
            {t("loginCta")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
