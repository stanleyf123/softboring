"use client";

import { SoftCssEmpty, type SoftEmptyKind } from "./soft-empty-illu";
import { SoftShapesEmpty } from "./soft-doodles";
import { Link } from "@/i18n/navigation";

export type EmptyIllustration =
  | "default"
  | "history"
  | "digest"
  | "year"
  | "saved"
  | "wall"
  | "activity"
  | "trends";

function isCssEmpty(kind: EmptyIllustration): kind is SoftEmptyKind {
  return kind === "wall" || kind === "history" || kind === "activity";
}

export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
  wash = "bg-paper",
  illustration = "default",
  whisper,
}: {
  title: string;
  body: string;
  ctaHref?: "/review" | "/history" | "/wall" | "/pricing" | "/wall/saved";
  ctaLabel?: string;
  wash?: string;
  illustration?: EmptyIllustration;
  whisper?: string;
}) {
  return (
    <section
      className={`rounded-[2rem] ${wash} px-8 py-12 shadow-card`}
      data-empty-state={illustration}
    >
      {isCssEmpty(illustration) ? (
        <SoftCssEmpty kind={illustration} />
      ) : (
        <SoftShapesEmpty
          kind={illustration}
          className="h-20 w-20 animate-[soft-empty-float_4s_ease-in-out_infinite] sm:h-24 sm:w-24"
        />
      )}
      {whisper ? (
        <p className="mt-4 font-display text-lg italic tracking-tight text-accent">{whisper}</p>
      ) : null}
      <h2 className={`${whisper ? "mt-3" : "mt-5"} font-display text-2xl tracking-tight`}>{title}</h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}

export function ListSkeleton({
  rows = 3,
  label,
}: {
  rows?: number;
  label: string;
}) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[1.75rem] bg-paper px-6 py-5 shadow-card"
        >
          <div className="h-3 w-24 rounded-full bg-blush/80" />
          <div className="mt-4 h-4 w-4/5 rounded-full bg-peach/90" />
          <div className="mt-2 h-4 w-2/3 rounded-full bg-peach/70" />
        </div>
      ))}
    </div>
  );
}

const WALL_SKELETON_CARDS = ["-rotate-2", "rotate-1", "-rotate-1"] as const;

/** Cream placeholders for the first Soft Wall paint. Not real notes. */
export function WallSkeleton({ label }: { label: string }) {
  return (
    <div
      className="soft-wall-skeleton mt-6 rounded-[1.75rem] border border-line/70 bg-cream/90 px-5 py-6 sm:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-wall-skeleton="cream"
    >
      <div className="max-w-lg space-y-3" aria-hidden="true">
        <div className="soft-wall-skeleton__bar h-3 w-24 rounded-full bg-blush/80" />
        <div className="soft-wall-skeleton__bar h-8 w-2/3 max-w-xs rounded-full bg-peach/70" />
        <div className="soft-wall-skeleton__bar h-4 w-full rounded-full bg-mint/60" />
      </div>
      <div className="mt-8 flex flex-wrap gap-4" aria-hidden="true">
        {WALL_SKELETON_CARDS.map((tilt) => (
          <div
            key={tilt}
            className={`soft-wall-skeleton__card h-40 w-full max-w-[13rem] rounded-[1.4rem] bg-cream px-4 py-4 shadow-card ${tilt}`}
            data-wall-skeleton-card=""
          >
            <div className="soft-wall-skeleton__bar h-3 w-16 rounded-full bg-blush/90" />
            <div className="soft-wall-skeleton__bar mt-4 h-3 w-4/5 rounded-full bg-peach/80" />
            <div className="soft-wall-skeleton__bar mt-2 h-3 w-2/3 rounded-full bg-peach/55" />
            <div className="soft-wall-skeleton__bar mt-6 h-3 w-10 rounded-full bg-mint/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
