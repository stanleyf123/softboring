"use client";

import { Link } from "@/i18n/navigation";
import {
  GRATITUDE_SHARE_FILENAME,
  gratitudeShareLine,
  renderGratitudeSharePng,
} from "@/lib/gratitude-share-card";
import { GRATITUDE_MAX } from "@/lib/gratitude-jar";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type DrawnLine = { id: string; body: string; createdAt: string };

type JarPayload = {
  count: number;
  maxLength: number;
  drawn: DrawnLine | null;
};

export function GratitudeJarCard({
  signedIn,
  softPlus,
  variant = "home",
}: {
  signedIn: boolean;
  softPlus: boolean;
  variant?: "home" | "account";
}) {
  const t = useTranslations("GratitudeJar");
  const hydrated = useHydrated();
  const [count, setCount] = useState(0);
  const [maxLength, setMaxLength] = useState(GRATITUDE_MAX);
  const [body, setBody] = useState("");
  const [drawn, setDrawn] = useState<DrawnLine | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<"generic" | "full" | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawEmpty, setDrawEmpty] = useState(false);
  const [drawError, setDrawError] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/gratitude-jar", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as JarPayload;
        if (cancelled) return;
        setCount(typeof data.count === "number" ? data.count : 0);
        setMaxLength(data.maxLength || GRATITUDE_MAX);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, softPlus]);

  const shell =
    variant === "account"
      ? "mt-8 rounded-[1.5rem] bg-blush/45 px-5 py-5"
      : "rounded-[1.75rem] bg-blush/50 px-5 py-5 shadow-card sm:px-6";

  if (!signedIn) {
    return (
      <section className={shell} data-gratitude-jar="guest" aria-labelledby="gratitude-jar-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="gratitude-jar-title" className="mt-1 font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted" data-gratitude-share="tease">
          {t("shareTease")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/login", query: { next: "/" } }}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted"
          >
            {t("loginCta")}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
          >
            {t("lockedCta")}
          </Link>
        </div>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section className={shell} data-gratitude-jar="tease" aria-labelledby="gratitude-jar-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="gratitude-jar-title" className="mt-1 font-display text-lg tracking-tight">
          {t("lockedTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("lockedBody")}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted" data-gratitude-share="tease">
          {t("shareTease")}
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("lockedCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!loaded && !loadError)) {
    return (
      <section
        className={shell}
        data-gratitude-jar="loading"
        aria-labelledby="gratitude-jar-title"
        aria-busy="true"
      >
        <p id="gratitude-jar-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={shell} data-gratitude-jar="error" aria-labelledby="gratitude-jar-title">
        <p id="gratitude-jar-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const response = await fetch("/api/gratitude-jar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (response.status === 409) {
        setSaveError("full");
        return;
      }
      if (!response.ok) {
        setSaveError("generic");
        return;
      }
      const data = (await response.json()) as { count?: number; maxLength?: number };
      setCount(typeof data.count === "number" ? data.count : count + 1);
      if (data.maxLength) setMaxLength(data.maxLength);
      setBody("");
      setSaved(true);
      setDrawEmpty(false);
    } catch {
      setSaveError("generic");
    } finally {
      setSaving(false);
    }
  }

  async function draw() {
    setDrawing(true);
    setDrawError(false);
    setDrawEmpty(false);
    try {
      const response = await fetch("/api/gratitude-jar?draw=1", { cache: "no-store" });
      if (!response.ok) {
        setDrawError(true);
        return;
      }
      const data = (await response.json()) as JarPayload;
      setCount(typeof data.count === "number" ? data.count : 0);
      if (!data.drawn?.body) {
        setDrawn(null);
        setDrawEmpty(true);
        return;
      }
      setDrawn(data.drawn);
      setShareError(false);
    } catch {
      setDrawError(true);
    } finally {
      setDrawing(false);
    }
  }

  async function saveCard() {
    const line = gratitudeShareLine(drawn?.body);
    if (!line) return;
    setSharing(true);
    setShareError(false);
    try {
      const blob = await renderGratitudeSharePng(line, {
        brand: t("cardBrand"),
        kind: t("cardKind"),
        footer: t("cardFooter"),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = GRATITUDE_SHARE_FILENAME;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setShareError(true);
    } finally {
      setSharing(false);
    }
  }

  async function release() {
    if (!drawn) return;
    setReleasing(true);
    try {
      const response = await fetch("/api/gratitude-jar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: drawn.id }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { count?: number };
      setCount(typeof data.count === "number" ? data.count : Math.max(0, count - 1));
      setDrawn(null);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <section className={shell} data-gratitude-jar="open" aria-labelledby="gratitude-jar-title">
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="gratitude-jar-title" className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-2 text-xs text-muted">{t("count", { count })}</p>
      <label className="mt-4 block">
        <span className="sr-only">{t("inputLabel")}</span>
        <input
          type="text"
          value={body}
          maxLength={maxLength}
          placeholder={t("placeholder")}
          onChange={(event) => {
            setBody(Array.from(event.target.value).slice(0, maxLength).join(""));
            setSaved(false);
            setSaveError(null);
          }}
          className="w-full rounded-full border border-line bg-paper/90 px-4 py-3 text-sm leading-relaxed outline-none focus:border-accent"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {t("counter", { count: Array.from(body).length, max: maxLength })}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || body.trim().length === 0}
            className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
          >
            {saving ? t("saving") : t("save")}
          </button>
          <button
            type="button"
            onClick={() => void draw()}
            disabled={drawing}
            className="rounded-full bg-paper px-4 py-2 text-sm shadow-card disabled:opacity-60"
          >
            {drawing ? t("drawing") : t("draw")}
          </button>
        </div>
      </div>
      {saved ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("saved")}
        </p>
      ) : null}
      {saveError === "full" ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {t("jarFull")}
        </p>
      ) : null}
      {saveError === "generic" ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {t("saveError")}
        </p>
      ) : null}
      {drawEmpty ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("drawEmpty")}
        </p>
      ) : null}
      {drawError ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {t("drawError")}
        </p>
      ) : null}
      {drawn ? (
        <div className="mt-4 rounded-[1.25rem] bg-paper/80 px-4 py-4" data-gratitude-drawn>
          <p className="text-xs text-muted">{t("drawnLabel")}</p>
          <p className="mt-2 font-display text-base leading-relaxed tracking-tight">“{drawn.body}”</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveCard()}
              disabled={sharing || gratitudeShareLine(drawn.body).length === 0}
              data-gratitude-share="download"
              className="rounded-full bg-cream px-4 py-2 text-sm shadow-card disabled:opacity-60"
            >
              {sharing ? t("shareBusy") : t("shareCta")}
            </button>
            <button
              type="button"
              onClick={() => void release()}
              disabled={releasing}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            >
              {releasing ? t("releasing") : t("release")}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t("shareNote")}</p>
          {shareError ? (
            <p className="mt-2 text-sm text-muted" role="alert">
              {t("shareError")}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
    </section>
  );
}
