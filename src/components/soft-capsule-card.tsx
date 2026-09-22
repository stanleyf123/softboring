"use client";

import { Link } from "@/i18n/navigation";
import { CAPSULE_MAX, type PublicCapsule } from "@/lib/soft-capsule";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ShelfPayload = {
  capsules: PublicCapsule[];
  count: number;
  cap: number;
  maxLength: number;
  timeZone: string;
  minUnlockOn: string;
  maxUnlockOn: string;
};

export function SoftCapsuleCard({
  signedIn,
  softPlus,
  variant = "home",
}: {
  signedIn: boolean;
  softPlus: boolean;
  variant?: "home" | "account";
}) {
  const t = useTranslations("SoftCapsule");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [shelf, setShelf] = useState<ShelfPayload | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState("");
  const [unlockOn, setUnlockOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<"generic" | "date" | "full" | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/soft-capsules", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as ShelfPayload;
        if (cancelled) return;
        setShelf(data);
        setUnlockOn((current) => current || data.minUnlockOn || "");
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
      ? "mt-8 rounded-[1.5rem] bg-peach/45 px-5 py-5"
      : "rounded-[1.75rem] bg-peach/50 px-5 py-5 shadow-card sm:px-6";

  if (!signedIn) {
    return (
      <section className={shell} data-soft-capsule="guest" aria-labelledby="soft-capsule-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="soft-capsule-title" className="mt-1 font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
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
      <section className={shell} data-soft-capsule="tease" aria-labelledby="soft-capsule-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="soft-capsule-title" className="mt-1 font-display text-lg tracking-tight">
          {t("lockedTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("lockedBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("lockedCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!shelf && !loadError)) {
    return (
      <section
        className={shell}
        data-soft-capsule="loading"
        aria-labelledby="soft-capsule-title"
        aria-busy="true"
      >
        <p id="soft-capsule-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError || !shelf) {
    return (
      <section className={shell} data-soft-capsule="error" aria-labelledby="soft-capsule-title">
        <p id="soft-capsule-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  const maxLength = shelf.maxLength || CAPSULE_MAX;
  const used = Array.from(body).length;
  const full = shelf.count >= shelf.cap;

  function onBody(value: string) {
    const chars = Array.from(value);
    setBody(chars.length > maxLength ? chars.slice(0, maxLength).join("") : value);
    setSaved(false);
    setSaveError(null);
  }

  async function seal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || full) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const response = await fetch("/api/soft-capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, unlockOn }),
      });
      if (response.status === 409) {
        setSaveError("full");
        return;
      }
      if (response.status === 400) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setSaveError(data.error === "invalid_date" ? "date" : "generic");
        return;
      }
      if (!response.ok) {
        setSaveError("generic");
        return;
      }
      const data = (await response.json()) as ShelfPayload;
      setShelf(data);
      setBody("");
      setSaved(true);
    } catch {
      setSaveError("generic");
    } finally {
      setSaving(false);
    }
  }

  async function release(id: string) {
    if (releasingId) return;
    setReleasingId(id);
    setReleaseError(false);
    try {
      const response = await fetch("/api/soft-capsules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setReleaseError(true);
        return;
      }
      const data = (await response.json()) as ShelfPayload;
      setShelf(data);
    } catch {
      setReleaseError(true);
    } finally {
      setReleasingId(null);
    }
  }

  function when(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return format.dateTime(date, { dateStyle: "medium", timeZone: shelf?.timeZone });
  }

  return (
    <section className={shell} data-soft-capsule="shelf" aria-labelledby="soft-capsule-title">
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="soft-capsule-title" className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-2 text-xs text-muted">{t("count", { count: shelf.count })}</p>

      {shelf.capsules.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shelf.capsules.map((capsule) =>
            capsule.sealed ? (
              <li
                key={capsule.id}
                className="rounded-[1.25rem] bg-paper/80 px-4 py-4"
                data-soft-capsule="sealed"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-sm"
                    aria-hidden="true"
                  >
                    ●
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-accent">{t("sealedTitle")}</p>
                    <p className="mt-1 font-display text-lg tracking-tight">
                      {t("sealedUntil", { date: when(capsule.unlockAt) })}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{t("sealedBody")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void release(capsule.id)}
                  disabled={releasingId === capsule.id}
                  className="mt-3 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
                >
                  {releasingId === capsule.id ? t("releasing") : t("release")}
                </button>
              </li>
            ) : (
              <li
                key={capsule.id}
                className="rounded-[1.25rem] bg-cream/80 px-4 py-4"
                data-soft-capsule="open"
              >
                <p className="text-sm text-accent">{t("openTitle")}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("openedOn", { date: when(capsule.unlockAt) })}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{capsule.body}</p>
                <button
                  type="button"
                  onClick={() => void release(capsule.id)}
                  disabled={releasingId === capsule.id}
                  className="mt-3 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
                >
                  {releasingId === capsule.id ? t("releasing") : t("release")}
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={seal} className="mt-5 space-y-3">
        <label className="block">
          <span className="text-sm">{t("inputLabel")}</span>
          <textarea
            value={body}
            onChange={(event) => onBody(event.target.value)}
            rows={3}
            placeholder={t("placeholder")}
            className="mt-2 w-full resize-none rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-foreground shadow-card outline-none focus:border-accent"
          />
        </label>
        <p className="text-xs text-muted">{t("counter", { count: used, max: maxLength })}</p>
        <label className="block">
          <span className="text-sm">{t("dateLabel")}</span>
          <input
            type="date"
            value={unlockOn}
            min={shelf.minUnlockOn}
            max={shelf.maxUnlockOn}
            onChange={(event) => {
              setUnlockOn(event.target.value);
              setSaved(false);
              setSaveError(null);
            }}
            required
            className="mt-2 rounded-full border border-line bg-paper px-4 py-2 text-sm text-foreground shadow-card outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={saving || full || used === 0 || !unlockOn}
          className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {saving ? t("sealing") : t("seal")}
        </button>
        {saved ? <p className="text-sm text-muted">{t("sealed")}</p> : null}
        {saveError === "date" ? <p className="text-sm text-muted">{t("invalidDate")}</p> : null}
        {saveError === "full" ? <p className="text-sm text-muted">{t("full")}</p> : null}
        {saveError === "generic" ? <p className="text-sm text-muted">{t("saveError")}</p> : null}
        {releaseError ? <p className="text-sm text-muted">{t("releaseError")}</p> : null}
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
    </section>
  );
}
