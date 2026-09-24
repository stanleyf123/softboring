"use client";

import { Link } from "@/i18n/navigation";
import { monthlyReportBars, type MonthlySoftReport, type ReportBarKey } from "@/lib/soft-report";
import { useTranslations } from "next-intl";

const TILES = [
  { key: "thanksGiven", label: "thanksLabel", wash: "bg-peach/70", fill: "bg-peach" },
  { key: "echoes", label: "echoesLabel", wash: "bg-blush/70", fill: "bg-blush" },
  { key: "gratitudesDrawn", label: "drawsLabel", wash: "bg-mint/70", fill: "bg-mint" },
  { key: "pauseWeeks", label: "pausesLabel", wash: "bg-cream", fill: "bg-lemon" },
] as const;

const TILE_BY_KEY = Object.fromEntries(TILES.map((tile) => [tile.key, tile])) as Record<
  ReportBarKey,
  (typeof TILES)[number]
>;

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
      <SoftReportChart report={report} />
    </section>
  );
}

function SoftReportChart({ report }: { report: MonthlySoftReport }) {
  const t = useTranslations("Digest");
  const bars = monthlyReportBars(report);
  const empty = bars.every((bar) => bar.count === 0);

  return (
    <div
      className="mt-6"
      data-soft-report-chart="open"
      data-soft-report-empty={empty ? "1" : "0"}
    >
      <p className="text-sm leading-relaxed text-muted">{t("chartLead")}</p>
      {empty ? <p className="mt-2 text-sm leading-relaxed text-muted">{t("chartEmpty")}</p> : null}
      <ul className="mt-4 space-y-3">
        {bars.map((bar) => {
          const tile = TILE_BY_KEY[bar.key];
          return (
            <li key={bar.key} data-soft-report-bar={bar.key} data-soft-report-width={bar.width}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">{t(tile.label)}</span>
                <span>{t("reportCount", { count: bar.count })}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream" aria-hidden="true">
                <div className={`h-2 rounded-full ${tile.fill}`} style={{ width: `${bar.width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
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
      <div className="mt-6" data-soft-report-chart="tease">
        <p className="text-sm leading-relaxed text-muted">{t("chartTeaseLead")}</p>
        <ul className="mt-4 space-y-3">
          {TILES.map((tile) => (
            <li key={tile.key} data-soft-report-bar={tile.key} data-soft-report-width="0">
              <div className="flex items-baseline justify-between gap-3 text-sm text-muted">
                <span>{t(tile.label)}</span>
                <span>{t("teaseValue")}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-cream" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
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
