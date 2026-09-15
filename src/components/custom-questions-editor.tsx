"use client";

import {
  MAX_CUSTOM_QUESTIONS,
  type CustomQuestion,
} from "@/lib/custom-questions";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CustomQuestionsEditor({
  initialQuestions,
}: {
  initialQuestions: CustomQuestion[];
}) {
  const t = useTranslations("Account");
  const [questions, setQuestions] = useState<CustomQuestion[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  function updatePrompt(id: string, prompt: string) {
    setQuestions((current) =>
      current.map((item) => (item.id === id ? { ...item, prompt } : item)),
    );
    setSaved(false);
  }

  function addQuestion() {
    if (questions.length >= MAX_CUSTOM_QUESTIONS) return;
    setQuestions((current) => [
      ...current,
      { id: crypto.randomUUID(), prompt: "" },
    ]);
    setSaved(false);
  }

  function removeQuestion(id: string) {
    setQuestions((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      const response = await fetch("/api/account/custom-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: questions.filter((item) => item.prompt.trim()),
        }),
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const data = (await response.json()) as { questions: CustomQuestion[] };
      setQuestions(data.questions);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-[1.5rem] bg-mint/40 px-5 py-5">
      <p className="font-display text-lg tracking-tight">{t("customTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("customBody")}</p>
      <ul className="mt-4 space-y-3">
        {questions.map((question, index) => (
          <li key={question.id} className="flex gap-2">
            <input
              value={question.prompt}
              onChange={(event) => updatePrompt(question.id, event.target.value)}
              maxLength={200}
              placeholder={t("customPlaceholder", { n: index + 1 })}
              className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => removeQuestion(question.id)}
              className="shrink-0 rounded-full px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              {t("customRemove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= MAX_CUSTOM_QUESTIONS}
          className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50"
        >
          {t("customAdd")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {saving ? t("reminderSaving") : t("customSave")}
        </button>
      </div>
      {saved ? <p className="mt-3 text-sm text-muted">{t("customSaved")}</p> : null}
      {error ? <p className="mt-3 text-sm text-accent">{t("customError")}</p> : null}
    </div>
  );
}
