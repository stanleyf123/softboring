"use client";

import { SoftShapesEmpty } from "./soft-doodles";
import { Link } from "@/i18n/navigation";

export type EmptyIllustration = "default" | "history" | "digest" | "year" | "saved";

export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
  wash = "bg-paper",
  illustration = "default",
}: {
  title: string;
  body: string;
  ctaHref?: "/review" | "/history" | "/wall" | "/pricing" | "/wall/saved";
  ctaLabel?: string;
  wash?: string;
  illustration?: EmptyIllustration;
}) {
  return (
    <section className={`rounded-[2rem] ${wash} px-8 py-12 shadow-card`}>
      <SoftShapesEmpty
        kind={illustration}
        className="h-20 w-20 animate-[soft-empty-float_4s_ease-in-out_infinite] sm:h-24 sm:w-24"
      />
      <h2 className="mt-5 font-display text-2xl tracking-tight">{title}</h2>
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

export function WallSkeleton({ label }: { label: string }) {
  return (
    <div
      className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-line/80 bg-paper/40"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="absolute left-10 top-10 h-36 w-52 animate-pulse rounded-[1.4rem] bg-peach/80 shadow-card" />
      <div className="absolute left-72 top-24 h-36 w-52 animate-pulse rounded-[1.4rem] bg-blush/80 shadow-card" />
      <div className="absolute left-40 top-56 h-36 w-52 animate-pulse rounded-[1.4rem] bg-mint/80 shadow-card" />
    </div>
  );
}
