"use client";

import { SoftMark } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import type { SoftMemory } from "@/lib/soft-memory";
import { useFormatter, useTranslations } from "next-intl";

export function SoftMemoryCard({ memory }: { memory: SoftMemory | null }) {
  const t = useTranslations("SoftMemory");
  const format = useFormatter();

  if (!memory) return null;

  const when = format.dateTime(new Date(memory.createdAt), {
    dateStyle: "medium",
  });

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-cream/90 px-5 py-5 shadow-card"
      aria-labelledby="soft-memory-title"
    >
      <div className="flex items-start gap-3">
        <SoftMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p id="soft-memory-title" className="font-display text-lg tracking-tight">
            {t("title")}
          </p>
          <p className="mt-1 text-sm text-muted">{t("lead", { date: when })}</p>
          {memory.locked ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t("teaser")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/history/${memory.id}`}
                  className="rounded-full border border-line bg-paper px-4 py-2 text-sm shadow-card"
                >
                  {t("openLocked")}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full bg-mint px-4 py-2 text-sm shadow-card"
                >
                  {t("softPlusCta")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                {memory.excerpt.trim() ? memory.excerpt : t("untitled")}
              </p>
              <Link
                href={`/history/${memory.id}`}
                className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
              >
                {t("open")}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
