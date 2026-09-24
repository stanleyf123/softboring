"use client";

import {
  WALL_FILTER_STICKY_CLASS,
  type WallStickyChip,
} from "@/lib/wall-filter-sticky";

export function WallFilterSticky({
  chips,
  label,
  result,
  clearLabel,
  onClear,
}: {
  chips: WallStickyChip[];
  label: string;
  result: string;
  clearLabel: string;
  onClear: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className={WALL_FILTER_STICKY_CLASS} data-wall-filter-sticky role="status" aria-label={label}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          data-wall-sticky-chip={chip.id}
          className="inline-flex max-w-full items-center whitespace-normal break-words rounded-full bg-paper px-3 py-1.5 text-left text-sm leading-snug text-foreground shadow-card"
        >
          {chip.label}
        </span>
      ))}
      <span className="text-xs leading-relaxed text-muted">{result}</span>
      <button
        type="button"
        data-wall-filter-sticky-clear
        onClick={onClear}
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {clearLabel}
      </button>
    </div>
  );
}
