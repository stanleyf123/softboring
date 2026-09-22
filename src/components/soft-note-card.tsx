"use client";

import { Link } from "@/i18n/navigation";
import { SOFT_NOTE_MAX } from "@/lib/soft-note";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type SoftNotePayload = {
  weekKey: string;
  maxLength: number;
  note: { id: string; body: string; weekKey: string } | null;
};

export function SoftNoteCard({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("SoftNote");
  const hydrated = useHydrated();
  const [body, setBody] = useState("");
  const [weekKey, setWeekKey] = useState("");
  const [maxLength, setMaxLength] = useState(SOFT_NOTE_MAX);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/soft-notes", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as SoftNotePayload;
        if (cancelled) return;
        setWeekKey(data.weekKey);
        setMaxLength(data.maxLength || SOFT_NOTE_MAX);
        setBody(data.note?.body ?? "");
        setLoaded(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn]);

  if (!signedIn) {
    return (
      <section className="rounded-[1.75rem] bg-mint/40 px-6 py-6 shadow-card sm:px-8">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/review" } }}
          className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!loaded && !loadError)) {
    return (
      <section className="rounded-[1.75rem] bg-mint/40 px-6 py-6 shadow-card sm:px-8">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-[1.75rem] bg-mint/40 px-6 py-6 shadow-card sm:px-8">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const response = await fetch("/api/soft-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        setSaveError(true);
        return;
      }
      const data = (await response.json()) as SoftNotePayload;
      setBody(data.note?.body ?? "");
      setWeekKey(data.weekKey);
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] bg-mint/40 px-6 py-6 shadow-card sm:px-8">
      <p className="font-display text-lg tracking-tight">{t("title")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      {weekKey ? (
        <p className="mt-2 text-xs text-muted">{t("weekLabel", { week: weekKey })}</p>
      ) : null}
      <label className="mt-4 block">
        <span className="sr-only">{t("inputLabel")}</span>
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value.slice(0, maxLength));
            setSaved(false);
          }}
          rows={3}
          maxLength={maxLength}
          placeholder={t("placeholder")}
          className="w-full resize-y rounded-[1.25rem] border border-line bg-paper/90 px-4 py-3 text-sm leading-relaxed outline-none focus:border-accent"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {t("counter", { count: Array.from(body).length, max: maxLength })}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
      {saved ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("saved")}
        </p>
      ) : null}
      {saveError ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {t("saveError")}
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
    </section>
  );
}
