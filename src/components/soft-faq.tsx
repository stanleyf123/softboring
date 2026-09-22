"use client";

import { softFaqIds, toggleSoftFaq, type SoftFaqId } from "@/lib/soft-faq";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export function SoftFaq() {
  const t = useTranslations("SoftFaq");
  const [open, setOpen] = useState<SoftFaqId | null>(null);
  const baseId = useId();
  const copy = {
    payments: { q: t("paymentsQ"), a: t("paymentsA") },
    reminders: { q: t("remindersQ"), a: t("remindersA") },
    freeWindow: { q: t("freeWindowQ"), a: t("freeWindowA") },
    thanks: { q: t("thanksQ"), a: t("thanksA") },
    cancel: { q: t("cancelQ"), a: t("cancelA") },
  } satisfies Record<SoftFaqId, { q: string; a: string }>;

  return (
    <section
      id="soft-faq"
      className="rounded-[2rem] bg-cream px-6 py-8 shadow-card sm:px-8"
      data-soft-faq=""
      aria-labelledby={`${baseId}-title`}
    >
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h2 id={`${baseId}-title`} className="mt-2 font-display text-3xl tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-6 space-y-3">
        {softFaqIds().map((id) => {
          const expanded = open === id;
          const panelId = `${baseId}-${id}`;
          const buttonId = `${panelId}-button`;
          return (
            <div key={id} className="rounded-[1.4rem] bg-paper/90">
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  data-soft-faq-item={id}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm leading-snug"
                  onClick={() => setOpen((current) => toggleSoftFaq(current, id))}
                >
                  <span>{copy[id].q}</span>
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-peach text-base leading-none"
                  >
                    {expanded ? "–" : "+"}
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!expanded}
                className="px-4 pb-4 text-sm leading-relaxed text-muted"
              >
                {copy[id].a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
