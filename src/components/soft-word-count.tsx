"use client";

import {
  countSoftParts,
  readSoftCountEnabled,
  SOFT_COUNT_STORAGE_KEY,
  writeSoftCountEnabled,
} from "@/lib/soft-word-count";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** A quiet optional count. No goal, no color, no score. */
export function SoftWordCount({ parts }: { parts: readonly string[] }) {
  const t = useTranslations("Review");
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined" ? false : readSoftCountEnabled(window.localStorage),
  );
  const count = countSoftParts(parts);

  function toggle() {
    const next = !enabled;
    writeSoftCountEnabled(next, window.localStorage);
    setEnabled(next);
  }

  return (
    <div className="space-y-1" data-soft-count={enabled ? "on" : "off"} data-soft-count-key={SOFT_COUNT_STORAGE_KEY}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        {enabled ? t("softCountHide") : t("softCountShow")}
      </button>
      {enabled ? (
        <p className="text-sm text-muted" data-soft-count-words={count.words} data-soft-count-characters={count.characters}>
          {t("softCountLine", { characters: count.characters, words: count.words })}
          <span className="mt-0.5 block text-xs">{t("softCountHint")}</span>
        </p>
      ) : null}
    </div>
  );
}
