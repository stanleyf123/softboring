"use client";

import { Link } from "@/i18n/navigation";
import { capsulesOpenedThisWeek } from "@/lib/soft-opens";
import type { PublicCapsule } from "@/lib/soft-capsule";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ShelfPayload = {
  capsules: PublicCapsule[];
  timeZone?: string;
};

export function SoftOpensInbox({
  signedIn,
  softPlus,
}: {
  signedIn: boolean;
  softPlus: boolean;
}) {
  const t = useTranslations("SoftOpens");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [shelf, setShelf] = useState<ShelfPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

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
        if (!cancelled) setShelf(data);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, softPlus]);

  const shell = "mt-8 rounded-[1.5rem] bg-mint/35 px-5 py-5";

  if (!signedIn) {
    return (
      <section className={shell} data-soft-opens="guest" aria-labelledby="soft-opens-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="soft-opens-title" className="mt-1 font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/account" } }}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section className={shell} data-soft-opens="tease" aria-labelledby="soft-opens-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="soft-opens-title" className="mt-1 font-display text-lg tracking-tight">
          {t("teaseTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("teaseBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!shelf && !loadError)) {
    return (
      <section
        className={shell}
        data-soft-opens="loading"
        aria-labelledby="soft-opens-title"
        aria-busy="true"
      >
        <p id="soft-opens-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (loadError || !shelf) {
    return (
      <section className={shell} data-soft-opens="error" aria-labelledby="soft-opens-title">
        <p id="soft-opens-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loadError")}</p>
      </section>
    );
  }

  const opened = capsulesOpenedThisWeek(shelf.capsules, new Date(), shelf.timeZone);

  return (
    <section className={shell} data-soft-opens="shelf" aria-labelledby="soft-opens-title">
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="soft-opens-title" className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      {opened.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted" data-soft-opens="empty">
          {t("empty")}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">{t("count", { count: opened.length })}</p>
          <ul className="mt-3 space-y-3" data-soft-opens="list">
            {opened.map((capsule) => (
              <li
                key={capsule.id}
                className="rounded-[1.25rem] bg-paper/90 px-4 py-3 shadow-card"
                data-soft-open={capsule.id}
              >
                <p className="text-xs text-muted">
                  {t("openedOn", {
                    date: format.dateTime(new Date(capsule.unlockAt), { dateStyle: "medium" }),
                  })}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{capsule.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
    </section>
  );
}
