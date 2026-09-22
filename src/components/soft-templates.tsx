"use client";

import {
  SOFT_TEMPLATE_FIELDS,
  SOFT_TEMPLATE_IDS,
  applySoftTemplate,
  templateInsertNote,
  type SoftTemplateField,
  type SoftTemplateId,
  type SoftTemplateLines,
  type TemplateInsertNote,
} from "@/lib/soft-templates";
import { useTranslations } from "next-intl";
import { useState } from "react";

const WASH: Record<SoftTemplateId, string> = {
  quiet: "bg-cream",
  tender: "bg-blush/80",
  small: "bg-mint/70",
  restart: "bg-peach/80",
  full: "bg-lemon/70",
};

function linesFor(
  t: ReturnType<typeof useTranslations<"SoftTemplates">>,
  id: SoftTemplateId,
): SoftTemplateLines {
  const lines = {} as SoftTemplateLines;
  for (const field of SOFT_TEMPLATE_FIELDS) {
    lines[field] = t(`${id}.${field}`);
  }
  return lines;
}

export function SoftTemplates({
  values,
  onInsert,
}: {
  values: Partial<Record<SoftTemplateField, string>>;
  onInsert: (answers: Record<SoftTemplateField, string>, now: number) => void;
}) {
  const t = useTranslations("SoftTemplates");
  const [active, setActive] = useState<SoftTemplateId | null>(null);
  const [note, setNote] = useState<TemplateInsertNote | null>(null);

  function insert(id: SoftTemplateId, now: number) {
    const result = applySoftTemplate(values, linesFor(t, id));
    onInsert(result.answers, now);
    setActive(id);
    setNote(templateInsertNote(result.filled.length, result.kept.length));
  }

  const noteLabel =
    note === "filled" ? t("filled") : note === "partial" ? t("partial") : note === "kept" ? t("kept") : null;

  return (
    <section
      className="rounded-[1.75rem] bg-paper px-5 py-5 shadow-card"
      data-soft-templates="open"
      aria-label={t("title")}
    >
      <p className="font-display text-lg tracking-tight">{t("title")}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SOFT_TEMPLATE_IDS.map((id) => {
          const selected = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => insert(id, Date.now())}
                data-soft-template={id}
                aria-pressed={selected}
                className={`w-full rounded-[1.35rem] px-4 py-3 text-left shadow-card ${WASH[id]} ${
                  selected ? "ring-2 ring-accent/50" : ""
                }`}
              >
                <span className="block font-display text-base tracking-tight">{t(`${id}.name`)}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{t(`${id}.blurb`)}</span>
                <span className="mt-3 inline-flex rounded-full bg-paper/80 px-3 py-1 text-xs text-muted">
                  {selected ? t("using") : t("insert")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {noteLabel ? (
        <p className="mt-4 text-sm leading-relaxed text-muted" role="status" data-soft-template-note={note}>
          {noteLabel}
        </p>
      ) : null}
    </section>
  );
}
