"use client";

import { Link } from "@/i18n/navigation";
import { fetchTrendPoints } from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type Point = { id: string; createdAt: string; feeling: number };

export function TrendsPanel() {
  const t = useTranslations("Trends");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [points, setPoints] = useState<Point[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchTrendPoints();
        if (cancelled) return;
        if (!next.ok) {
          setLocked(true);
          return;
        }
        setPoints(next.points);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  if (!hydrated || (points === null && !locked && !error)) {
    return <div className="min-h-64" aria-hidden="true" />;
  }

  if (error) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("loadErrorTitle")}</h2>
        <p className="mt-3 text-muted leading-relaxed">{t("loadError")}</p>
      </section>
    );
  }

  if (locked) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("lockedBody")}</p>
        <Link
          href="/pricing"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("lockedCta")}
        </Link>
      </section>
    );
  }

  if (!points || points.length === 0) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("emptyTitle")}</h2>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("empty")}</p>
        <Link
          href="/review"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("emptyCta")}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
      <FeelingChart points={points} />
      <ol className="mt-8 space-y-3">
        {points.map((point) => (
          <li key={point.id} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">
              {format.dateTime(new Date(point.createdAt), { dateStyle: "medium" })}
            </span>
            <span>{t("feelingPoint", { value: point.feeling })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FeelingChart({ points }: { points: Point[] }) {
  const t = useTranslations("Trends");
  const path = useMemo(() => chartPath(points), [points]);

  return (
    <div>
      <p className="text-sm text-muted">{t("chartHint")}</p>
      <svg
        viewBox="0 0 320 160"
        className="mt-4 h-auto w-full"
        role="img"
        aria-label={t("chartLabel")}
      >
        <rect width="320" height="160" rx="24" fill="#fff8f2" />
        {[1, 2, 3, 4, 5].map((value) => {
          const y = yForFeeling(value);
          return (
            <g key={value}>
              <line
                x1="36"
                x2="300"
                y1={y}
                y2={y}
                stroke="#ead6c8"
                strokeWidth="1"
              />
              <text x="16" y={y + 4} fontSize="10" fill="#9a7f74">
                {value}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#c47f6e" strokeWidth="2.4" strokeLinecap="round" />
        {points.map((point, index) => {
          const { x, y } = pointAt(points, index);
          return <circle key={point.id} cx={x} cy={y} r="4.2" fill="#7d9b8c" />;
        })}
      </svg>
    </div>
  );
}

function yForFeeling(feeling: number) {
  return 132 - ((feeling - 1) / 4) * 96;
}

function pointAt(points: Point[], index: number) {
  const x =
    points.length === 1 ? 168 : 44 + (index / (points.length - 1)) * 244;
  return { x, y: yForFeeling(points[index].feeling) };
}

function chartPath(points: Point[]) {
  return points
    .map((point, index) => {
      const { x, y } = pointAt(points, index);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}
