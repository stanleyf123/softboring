"use client";

import { Link } from "@/i18n/navigation";
import {
  historyNeighborLabel,
  type HistoryWeekNeighbors,
} from "@/lib/history-week-nav";
import { useTranslations } from "next-intl";

const linkClass =
  "block min-h-11 rounded-[1.25rem] bg-paper px-4 py-3 text-left shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function HistoryWeekNav({ neighbors }: { neighbors: HistoryWeekNeighbors }) {
  const t = useTranslations("HistoryDetail");
  if (neighbors.openIndex < 1) return null;

  const earlier = neighbors.earlier;
  const later = neighbors.later;

  return (
    <nav
      aria-label={t("weekNavLabel")}
      data-history-week-nav="open"
      className="mt-6 rounded-[1.5rem] bg-cream/80 px-4 py-4"
    >
      <p className="text-sm text-muted" data-history-week-place="">
        {t("openPlace", { index: neighbors.openIndex, count: neighbors.openCount })}
      </p>
      {neighbors.openCount < 2 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted" data-history-week="only">
          {neighbors.lockedCount > 0 ? t("onlyOpen") : t("onlyWeek")}
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {earlier ? (
            <Link
              href={`/history/${earlier.id}`}
              data-history-week="earlier"
              className={linkClass}
            >
              <span className="block text-xs text-muted">{t("earlier")}</span>
              <span className="mt-1 block text-sm leading-relaxed">
                {historyNeighborLabel(earlier.summary, t("neighborUntitled"))}
              </span>
            </Link>
          ) : (
            <p className="px-1 py-2 text-sm text-muted" data-history-week="earlier-end">
              {t("earlierEnd")}
            </p>
          )}
          {later ? (
            <Link
              href={`/history/${later.id}`}
              data-history-week="later"
              className={linkClass}
            >
              <span className="block text-xs text-muted">{t("later")}</span>
              <span className="mt-1 block text-sm leading-relaxed">
                {historyNeighborLabel(later.summary, t("neighborUntitled"))}
              </span>
            </Link>
          ) : (
            <p className="px-1 py-2 text-sm text-muted" data-history-week="later-end">
              {t("laterEnd")}
            </p>
          )}
        </div>
      )}
    </nav>
  );
}
