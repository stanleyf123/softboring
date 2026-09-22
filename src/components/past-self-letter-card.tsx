"use client";

import { Link } from "@/i18n/navigation";
import { PAST_SELF_LETTER_MAX } from "@/lib/past-self-letter";
import { useHydrated } from "@/lib/use-hydrated";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type LetterPayload = {
  reviewId: string;
  weekKey: string;
  past: boolean;
  maxLength: number;
  letter: { id: string; body: string; reviewId: string } | null;
};

export function PastSelfLetterCard({
  reviewId,
  signedIn,
  softPlus,
}: {
  reviewId: string;
  signedIn: boolean;
  softPlus: boolean;
}) {
  const t = useTranslations("PastLetter");
  const hydrated = useHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const [body, setBody] = useState("");
  const [weekKey, setWeekKey] = useState("");
  const [past, setPast] = useState(true);
  const [maxLength, setMaxLength] = useState(PAST_SELF_LETTER_MAX);
  const [hadLetter, setHadLetter] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState<"generic" | "not_past" | null>(null);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/past-letters?reviewId=${encodeURIComponent(reviewId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as LetterPayload;
        if (cancelled) return;
        setWeekKey(data.weekKey);
        setPast(data.past === true);
        setMaxLength(data.maxLength || PAST_SELF_LETTER_MAX);
        setBody(data.letter?.body ?? "");
        setHadLetter(Boolean(data.letter?.body));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, reviewId, signedIn, softPlus]);

  useEffect(() => {
    if (!hydrated) return;
    if (window.location.hash !== "#past-self-letter") return;
    document.getElementById("past-self-letter")?.scrollIntoView({
      block: "start",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [hydrated, loaded, reducedMotion, signedIn, softPlus]);

  const shell =
    "past-self-sheet scroll-mt-28 mt-10 rounded-[1.75rem] bg-cream/90 px-6 py-6 shadow-card sm:px-8";

  if (!signedIn) {
    return (
      <section id="past-self-letter" className={shell} data-past-self-letter="guest">
        <p className="font-display text-lg tracking-tight">{t("teaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/history" } }}
          className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section id="past-self-letter" className={shell} data-past-self-letter="tease">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p className="mt-1 font-display text-lg tracking-tight">{t("teaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("teaseBody")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inApp")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!loaded && !loadError)) {
    return (
      <section id="past-self-letter" className={shell} data-past-self-letter="loading">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section id="past-self-letter" className={shell} data-past-self-letter="error">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const response = await fetch("/api/past-letters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, body }),
      });
      const data = (await response.json().catch(() => ({}))) as LetterPayload & {
        error?: string;
      };
      if (!response.ok) {
        setSaveError(data.error === "not_past" ? "not_past" : "generic");
        return;
      }
      setBody(data.letter?.body ?? "");
      setHadLetter(Boolean(data.letter?.body));
      setWeekKey(data.weekKey);
      setPast(data.past === true);
      setSaved(true);
    } catch {
      setSaveError("generic");
    } finally {
      setSaving(false);
    }
  }

  const length = Array.from(body).length;
  const trimmed = body.trim();
  const canSave = !saving && length <= maxLength && (trimmed.length > 0 || hadLetter);

  return (
    <section id="past-self-letter" className={shell} data-past-self-letter={past ? "editor" : "current"}>
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p className="mt-1 font-display text-lg tracking-tight">{t("title")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("inApp")}</p>
      {weekKey ? (
        <p className="mt-2 text-xs text-muted">{t("weekLabel", { week: weekKey })}</p>
      ) : null}
      {past ? (
        <>
          <label className="mt-4 block">
            <span className="sr-only">{t("inputLabel")}</span>
            <textarea
              value={body}
              onChange={(event) => {
                setSaved(false);
                setSaveError(null);
                setBody(Array.from(event.target.value).slice(0, maxLength).join(""));
              }}
              rows={5}
              placeholder={t("placeholder")}
              autoComplete="off"
              className="w-full resize-y rounded-[1.25rem] border border-line bg-paper px-4 py-3 text-sm leading-relaxed outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <p className="mt-2 text-xs text-muted">{t("count", { count: length, max: maxLength })}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
            >
              {saving ? t("saving") : trimmed.length === 0 ? t("clear") : t("save")}
            </button>
            {saved ? (
              <p className="text-sm text-muted" role="status">
                {t("saved")}
              </p>
            ) : null}
          </div>
          {saveError === "not_past" ? (
            <p className="mt-3 text-sm leading-relaxed text-muted" role="status">
              {t("notPast")}
            </p>
          ) : null}
          {saveError === "generic" ? (
            <p className="mt-3 text-sm leading-relaxed text-muted" role="status">
              {t("saveError")}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">{t("notPast")}</p>
          {body.trim() ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
