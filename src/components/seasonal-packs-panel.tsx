"use client";

import {
  SEASONAL_CUSTOM_FIELDS,
  SEASONAL_PACK_IDS,
  SEASONAL_PROMPT_FIELDS,
  customQuestionsFromPack,
  type SeasonalPackId,
  type SeasonalPromptField,
} from "@/lib/seasonal-packs";
import type { CustomQuestion } from "@/lib/custom-questions";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function packPrompts(
  t: ReturnType<typeof useTranslations<"SeasonalPacks">>,
  packId: SeasonalPackId,
): Record<SeasonalPromptField, string> {
  const prompts = {} as Record<SeasonalPromptField, string>;
  for (const field of SEASONAL_PROMPT_FIELDS) {
    prompts[field] = t(`packs.${packId}.${field}`);
  }
  return prompts;
}

export function SeasonalPacksPanel({
  mode,
  onUseThisWeek,
  activePackId = null,
  onClearThisWeek,
  onCustomApplied,
}: {
  mode: "account" | "review";
  onUseThisWeek?: (packId: SeasonalPackId) => void;
  activePackId?: SeasonalPackId | null;
  onClearThisWeek?: () => void;
  onCustomApplied?: (questions: CustomQuestion[]) => void;
}) {
  const t = useTranslations("SeasonalPacks");
  const [busyId, setBusyId] = useState<SeasonalPackId | null>(null);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  async function applyAsCustom(packId: SeasonalPackId) {
    if (busyId) return;
    setBusyId(packId);
    setMessage(null);
    try {
      const prompts = packPrompts(t, packId);
      const questions = customQuestionsFromPack(
        packId,
        SEASONAL_CUSTOM_FIELDS.map((field) => prompts[field]),
      );
      const response = await fetch("/api/account/custom-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!response.ok) {
        setMessage("error");
        return;
      }
      const data = (await response.json()) as { questions: CustomQuestion[] };
      onCustomApplied?.(data.questions);
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className={
        mode === "account"
          ? "mt-8 rounded-[1.5rem] bg-lemon/35 px-5 py-5"
          : "rounded-[1.75rem] bg-lemon/30 px-5 py-5 shadow-card"
      }
    >
      <p className="font-display text-lg tracking-tight">{t("title")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>

      {mode === "review" && activePackId ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[1.25rem] bg-paper/80 px-4 py-3 text-sm">
          <span>
            {t("activeBanner", { name: t(`packs.${activePackId}.name`) })}
          </span>
          {onClearThisWeek ? (
            <button
              type="button"
              onClick={onClearThisWeek}
              className="rounded-full border border-line px-3 py-1.5 text-muted hover:text-foreground"
            >
              {t("clearWeek")}
            </button>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-5 space-y-4">
        {SEASONAL_PACK_IDS.map((packId) => (
          <li
            key={packId}
            className="rounded-[1.35rem] bg-paper/85 px-4 py-4"
          >
            <p className="font-display text-base tracking-tight">
              {t(`packs.${packId}.name`)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {t(`packs.${packId}.blurb`)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {mode === "review" && onUseThisWeek ? (
                <button
                  type="button"
                  onClick={() => onUseThisWeek(packId)}
                  className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
                >
                  {activePackId === packId ? t("usingThisWeek") : t("useThisWeek")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void applyAsCustom(packId)}
                disabled={busyId === packId}
                className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
              >
                {busyId === packId ? t("applying") : t("applyCustom")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {message === "saved" ? (
        <p className="mt-4 text-sm text-muted">{t("appliedCustom")}</p>
      ) : null}
      {message === "error" ? (
        <p className="mt-4 text-sm text-accent">{t("applyError")}</p>
      ) : null}
    </div>
  );
}
