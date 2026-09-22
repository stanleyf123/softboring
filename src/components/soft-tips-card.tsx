"use client";

import { SoftMark } from "@/components/soft-doodles";
import { SOFT_TIP_IDS, softTipIdForDate, type SoftTipId } from "@/lib/soft-tips";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export function SoftTipsCard({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("SoftTips");
  const todayId = useMemo(() => softTipIdForDate(), []);
  const [index, setIndex] = useState(() => SOFT_TIP_IDS.indexOf(todayId));
  const tipId = SOFT_TIP_IDS[index] as SoftTipId;

  if (!softPlus) return null;

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-mint/35 px-5 py-5"
      aria-labelledby="soft-tips-title"
    >
      <div className="flex items-start gap-3">
        <SoftMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p id="soft-tips-title" className="font-display text-lg tracking-tight">
            {t("title")}
          </p>
          <p className="mt-1 text-sm text-muted">{t("lead")}</p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">{t(tipId)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIndex((current) => (current + 1) % SOFT_TIP_IDS.length)}
              className="rounded-full bg-paper px-4 py-2 text-sm shadow-card"
            >
              {t("next")}
            </button>
            <p className="self-center text-xs text-muted">
              {t("counter", { current: index + 1, total: SOFT_TIP_IDS.length })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SoftTipsList({ limit = 4 }: { limit?: number }) {
  const t = useTranslations("SoftTips");
  const start = useMemo(() => softTipIdForDate(), []);
  const startIndex = SOFT_TIP_IDS.indexOf(start);
  const tips = Array.from({ length: Math.min(limit, SOFT_TIP_IDS.length) }, (_, offset) => {
    const id = SOFT_TIP_IDS[(startIndex + offset) % SOFT_TIP_IDS.length];
    return { id, body: t(id) };
  });

  return (
    <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
      {tips.map((tip) => (
        <li
          key={tip.id}
          className="rounded-2xl bg-mint/40 px-3 py-2 text-sm leading-relaxed text-foreground"
        >
          <p className="font-display text-sm">{t("inboxLabel")}</p>
          <p className="mt-1 text-muted">{tip.body}</p>
        </li>
      ))}
    </ul>
  );
}
