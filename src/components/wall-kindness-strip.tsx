"use client";

import { Link } from "@/i18n/navigation";
import type { KindnessEchoStamp, KindnessStamp } from "@/lib/wall-kindness";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type KindnessPayload = {
  weekKey: string;
  timeZone: string;
  thanks: KindnessStamp[];
  echoes: KindnessEchoStamp[];
};

function authorName(nickname: string | null, someone: string) {
  return nickname?.trim() || someone;
}

export function WallKindnessStrip({
  signedIn,
  softPlus,
  refreshToken = 0,
  onOpen,
}: {
  signedIn: boolean;
  softPlus: boolean;
  refreshToken?: number;
  onOpen?: (noteId: string) => void;
}) {
  const t = useTranslations("WallKindness");
  const hydrated = useHydrated();
  const [digest, setDigest] = useState<KindnessPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/wall/kindness", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as KindnessPayload;
        if (!cancelled) {
          setError(false);
          setDigest({
            weekKey: data.weekKey,
            timeZone: data.timeZone,
            thanks: Array.isArray(data.thanks) ? data.thanks : [],
            echoes: Array.isArray(data.echoes) ? data.echoes : [],
          });
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, softPlus, refreshToken]);

  if (!signedIn) {
    return (
      <section
        className="mt-6 rounded-[1.75rem] bg-mint/50 px-5 py-5 shadow-card sm:px-6"
        data-wall-kindness="guest"
        aria-labelledby="wall-kindness-title"
      >
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="wall-kindness-title" className="mt-1 font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/login", query: { next: "/wall" } }}
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
      <section
        className="mt-6 rounded-[1.75rem] bg-mint/50 px-5 py-5 shadow-card sm:px-6"
        data-wall-kindness="tease"
        aria-labelledby="wall-kindness-title"
      >
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="wall-kindness-title" className="mt-1 font-display text-lg tracking-tight">
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

  if (!hydrated || (digest === null && !error)) {
    return (
      <section
        className="mt-6 rounded-[1.75rem] bg-mint/45 px-5 py-5 shadow-card sm:px-6"
        data-wall-kindness="loading"
        aria-labelledby="wall-kindness-title"
        aria-busy="true"
      >
        <p id="wall-kindness-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error || !digest) {
    return (
      <section
        className="mt-6 rounded-[1.75rem] bg-mint/45 px-5 py-5 shadow-card sm:px-6"
        data-wall-kindness="error"
        aria-labelledby="wall-kindness-title"
      >
        <p id="wall-kindness-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  const quiet = digest.thanks.length === 0 && digest.echoes.length === 0;

  return (
    <section
      className="mt-6 rounded-[1.75rem] bg-mint/45 px-5 py-5 shadow-card sm:px-6"
      data-wall-kindness="open"
      aria-labelledby="wall-kindness-title"
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="wall-kindness-title" className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-2 text-xs text-muted">
        {t("timezoneNote", { week: digest.weekKey, zone: digest.timeZone })}
      </p>
      {quiet ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <KindnessColumn
            title={t("thanksTitle")}
            empty={t("thanksEmpty")}
            items={digest.thanks}
            someone={t("someone")}
            openLabel={t("open")}
            hiddenNote={t("hiddenNote")}
            listAria={t("listAria")}
            onOpen={onOpen}
          />
          <EchoColumn
            title={t("echoesTitle")}
            empty={t("echoesEmpty")}
            items={digest.echoes}
            someone={t("someone")}
            openLabel={t("open")}
            hiddenNote={t("hiddenNote")}
            onOpen={onOpen}
          />
        </div>
      )}
    </section>
  );
}

function KindnessColumn({
  title,
  empty,
  items,
  someone,
  openLabel,
  hiddenNote,
  listAria,
  onOpen,
}: {
  title: string;
  empty: string;
  items: KindnessStamp[];
  someone: string;
  openLabel: string;
  hiddenNote: string;
  listAria: string;
  onOpen?: (noteId: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-muted">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2" aria-label={listAria}>
          {items.map((item) => (
            <li key={`${item.noteId}:${item.at}`} className="rounded-[1.25rem] bg-paper/90 px-4 py-3">
              <p className="text-sm leading-relaxed">
                {item.hidden ? hiddenNote : item.excerpt.trim() || hiddenNote}
              </p>
              <p className="mt-2 text-xs text-muted">{authorName(item.nickname, someone)}</p>
              <NoteLink noteId={item.noteId} label={openLabel} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EchoColumn({
  title,
  empty,
  items,
  someone,
  openLabel,
  hiddenNote,
  onOpen,
}: {
  title: string;
  empty: string;
  items: KindnessEchoStamp[];
  someone: string;
  openLabel: string;
  hiddenNote: string;
  onOpen?: (noteId: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-muted">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={`${item.noteId}:${item.at}`} className="rounded-[1.25rem] bg-paper/90 px-4 py-3">
              <p className="text-sm leading-relaxed">{item.body}</p>
              <p className="mt-2 text-xs text-muted">
                {item.hidden ? hiddenNote : item.excerpt.trim() || someone}
                {` · ${authorName(item.nickname, someone)}`}
              </p>
              <NoteLink noteId={item.noteId} label={openLabel} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteLink({
  noteId,
  label,
  onOpen,
}: {
  noteId: string;
  label: string;
  onOpen?: (noteId: string) => void;
}) {
  return (
    <Link
      href={`/wall?note=${encodeURIComponent(noteId)}`}
      onClick={(event) => {
        if (!onOpen) return;
        event.preventDefault();
        onOpen(noteId);
      }}
      className="mt-2 inline-flex min-h-11 items-center text-sm text-accent"
    >
      {label}
    </Link>
  );
}
