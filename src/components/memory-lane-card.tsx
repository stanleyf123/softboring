"use client";

import { SoftMark } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import type { MemoryLane } from "@/lib/memory-lane";
import { useFormatter, useTranslations } from "next-intl";

export function MemoryLaneCard({ lane }: { lane: MemoryLane | null }) {
  const t = useTranslations("MemoryLane");
  const format = useFormatter();

  if (!lane) return null;

  const when = format.dateTime(new Date(lane.createdAt), { dateStyle: "medium" });
  const openOnWall = lane.source === "wall" && lane.noteId && !lane.hidden && !lane.locked;

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-lavender/70 px-5 py-5 shadow-card"
      aria-labelledby="memory-lane-title"
      data-memory-lane={lane.source}
    >
      <div className="flex items-start gap-3">
        <SoftMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {lane.source === "wall" ? t("wallKicker") : t("reviewKicker")}
          </p>
          <p id="memory-lane-title" className="mt-1 font-display text-lg tracking-tight">
            {t("title")}
          </p>
          <p className="mt-1 text-sm text-muted">{t("lead", { date: when })}</p>
          {lane.locked ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t("teaser")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/history/${lane.id}`}
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
                {lane.excerpt.trim() ? lane.excerpt : t("untitled")}
              </p>
              {openOnWall ? (
                <Link
                  href={{ pathname: "/wall", query: { note: lane.noteId ?? "" } }}
                  className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
                >
                  {t("openWall")}
                </Link>
              ) : (
                <Link
                  href={`/history/${lane.id}`}
                  className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
                >
                  {t("open")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
