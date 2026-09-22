"use client";

import { WALL_COLORS, type WallColor } from "@/lib/wall-canvas";
import { useTranslations } from "next-intl";

const SWATCH: Record<WallColor, string> = {
  peach: "bg-peach",
  blush: "bg-blush",
  mint: "bg-mint",
  cream: "bg-cream",
  lemon: "bg-lemon",
  sky: "bg-sky",
};

export function WallMoodLegend() {
  const t = useTranslations("Wall");

  return (
    <section
      className="mt-6 rounded-[1.5rem] bg-paper/80 px-4 py-4 shadow-card sm:px-5"
      aria-labelledby="wall-mood-legend-title"
    >
      <p id="wall-mood-legend-title" className="font-display text-base tracking-tight">
        {t("paletteTitle")}
      </p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("paletteLead")}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {WALL_COLORS.map((color) => (
          <li
            key={color}
            className="inline-flex items-center gap-2 rounded-full bg-cream/70 py-1 pl-1 pr-3 text-xs"
          >
            <span
              className={`h-5 w-5 shrink-0 rounded-full border border-line/80 ${SWATCH[color]}`}
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">{t(`color_${color}`)}</span>
              <span className="text-muted"> · {t(`palette_${color}`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
