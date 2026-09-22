"use client";

import { usePathname } from "@/i18n/navigation";
import {
  applyQuietWritingDom,
  QUIET_WRITING_EVENT,
  readQuietWriting,
  writeQuietWriting,
} from "@/lib/quiet-writing";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function isReviewPath(pathname: string) {
  return pathname === "/review" || pathname.startsWith("/review/");
}

/** Sync session quiet-writing flag onto <html> only while on /review. */
export function QuietWritingSync() {
  const pathname = usePathname();

  useEffect(() => {
    const onReview = isReviewPath(pathname);
    const wanted = onReview && readQuietWriting();
    applyQuietWritingDom(wanted);

    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ on?: boolean }>).detail;
      const next =
        typeof detail?.on === "boolean" ? detail.on : readQuietWriting();
      applyQuietWritingDom(isReviewPath(pathname) && next);
    }

    window.addEventListener(QUIET_WRITING_EVENT, onChange);
    return () => {
      window.removeEventListener(QUIET_WRITING_EVENT, onChange);
      applyQuietWritingDom(false);
    };
  }, [pathname]);

  return null;
}

export function QuietWritingToggle() {
  const t = useTranslations("Review");
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(readQuietWriting());
    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ on?: boolean }>).detail;
      if (typeof detail?.on === "boolean") setOn(detail.on);
      else setOn(readQuietWriting());
    }
    window.addEventListener(QUIET_WRITING_EVENT, onChange);
    return () => window.removeEventListener(QUIET_WRITING_EVENT, onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        writeQuietWriting(next);
        setOn(next);
      }}
      aria-pressed={on}
      className="quiet-writing-toggle inline-flex min-h-11 items-center rounded-full border border-line bg-paper/90 px-4 py-2 text-sm text-muted shadow-card hover:text-foreground"
    >
      {on ? t("quietExit") : t("quietEnter")}
    </button>
  );
}

/** Fixed exit control while chrome is hidden on /review. */
export function QuietWritingExit() {
  const t = useTranslations("Review");
  const pathname = usePathname();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(readQuietWriting());
    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ on?: boolean }>).detail;
      if (typeof detail?.on === "boolean") setOn(detail.on);
      else setOn(readQuietWriting());
    }
    window.addEventListener(QUIET_WRITING_EVENT, onChange);
    return () => window.removeEventListener(QUIET_WRITING_EVENT, onChange);
  }, []);

  if (!on || !isReviewPath(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => {
        writeQuietWriting(false);
        setOn(false);
      }}
      className="quiet-writing-exit fixed right-4 top-4 z-[60] inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-soft"
    >
      {t("quietExit")}
    </button>
  );
}
