"use client";

import { Link } from "@/i18n/navigation";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import {
  emptySoftReflection,
  reflectionCheckedCount,
  SOFT_REFLECTION_ITEMS,
  type SoftReflectionChecks,
  type SoftReflectionItem,
} from "@/lib/soft-reflection";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ReflectionPayload = {
  weekKey: string;
  checks: SoftReflectionChecks;
  saved: boolean;
};

function isPayload(value: unknown): value is ReflectionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as ReflectionPayload;
  if (typeof payload.weekKey !== "string") return false;
  const checks = payload.checks;
  if (!checks || typeof checks !== "object") return false;
  return SOFT_REFLECTION_ITEMS.every(
    (item) => typeof (checks as SoftReflectionChecks)[item] === "boolean",
  );
}

export function SoftReflectionCard({
  signedIn,
  softPlus,
}: {
  signedIn: boolean;
  softPlus: boolean;
}) {
  const t = useTranslations("SoftReflection");
  const hydrated = useHydrated();
  const [weekKey, setWeekKey] = useState("");
  const [checks, setChecks] = useState<SoftReflectionChecks>(emptySoftReflection());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/soft-reflections", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as unknown;
        if (cancelled) return;
        if (!isPayload(data)) {
          setLoadError(true);
          return;
        }
        setWeekKey(data.weekKey);
        setChecks(data.checks);
        setSaved(data.saved);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, softPlus]);

  const shell = "rounded-[1.75rem] bg-peach/55 px-6 py-6 shadow-card sm:px-8";

  if (!signedIn) {
    return (
      <section className={shell} data-soft-reflection="guest" aria-labelledby="soft-reflection-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <h2 id="soft-reflection-title" className="mt-1 font-display text-lg tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/review" } }}
          className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted`}
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section className={shell} data-soft-reflection="tease" aria-labelledby="soft-reflection-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <h2 id="soft-reflection-title" className="mt-1 font-display text-lg tracking-tight">
          {t("lockedTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("lockedBody")}</p>
        <Link
          href="/pricing"
          className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card`}
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
        data-soft-reflection="loading"
        aria-labelledby="soft-reflection-title"
        aria-busy="true"
      >
        <h2 id="soft-reflection-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={shell} data-soft-reflection="error" aria-labelledby="soft-reflection-title">
        <h2 id="soft-reflection-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  async function toggle(item: SoftReflectionItem) {
    if (saving) return;
    const previous = checks;
    const next = { ...checks, [item]: !checks[item] };
    setChecks(next);
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const response = await fetch("/api/soft-reflections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks: next }),
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isPayload(data)) {
        setChecks(previous);
        setSaveError(true);
        return;
      }
      setWeekKey(data.weekKey);
      setChecks(data.checks);
      setSaved(true);
    } catch {
      setChecks(previous);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const marked = reflectionCheckedCount(checks);

  return (
    <section
      className={shell}
      data-soft-reflection="ready"
      aria-labelledby="soft-reflection-title"
      aria-busy={saving}
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <h2 id="soft-reflection-title" className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      {weekKey ? (
        <p className="mt-2 text-xs tracking-wide text-muted">{t("weekLabel", { week: weekKey })}</p>
      ) : null}
      <fieldset className="mt-4 space-y-2 border-0 p-0">
        <legend className="sr-only">{t("checksLabel")}</legend>
        {SOFT_REFLECTION_ITEMS.map((item) => {
          const checked = checks[item];
          return (
            <label
              key={item}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-sm leading-relaxed ${
                checked ? "bg-mint/80" : "bg-paper/80"
              }`}
            >
              <input
                type="checkbox"
                name={item}
                data-reflection-item={item}
                checked={checked}
                disabled={saving}
                onChange={() => void toggle(item)}
                className={`${SOFT_CHROME_FOCUS} h-4 w-4 shrink-0 accent-accent`}
              />
              <span>{t(`items.${item}`)}</span>
            </label>
          );
        })}
      </fieldset>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {t("progress", { count: marked, total: SOFT_REFLECTION_ITEMS.length })}
      </p>
      {saved ? (
        <p className="mt-2 text-sm text-sage" role="status">
          {t("saved")}
        </p>
      ) : null}
      {saveError ? (
        <p className="mt-2 text-sm text-accent" role="alert">
          {t("saveError")}
        </p>
      ) : null}
    </section>
  );
}
