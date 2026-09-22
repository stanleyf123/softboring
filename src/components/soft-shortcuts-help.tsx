"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function isHelpPath(pathname: string) {
  return (
    pathname === "/wall" ||
    pathname.startsWith("/wall/") ||
    pathname === "/review" ||
    pathname.startsWith("/review/")
  );
}

function typingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** Soft ? help on Soft Wall and review — Quiet mode, Escape, filters. */
export function SoftShortcutsHelp() {
  const t = useTranslations("Shortcuts");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onPath = isHelpPath(pathname);

  useEffect(() => {
    if (!onPath) setOpen(false);
  }, [onPath]);

  useEffect(() => {
    if (!onPath) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }

      if (typingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onPath, open]);

  if (!onPath) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[55] inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper/95 text-sm text-muted shadow-card hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:bottom-6"
        aria-label={t("openAria")}
        title={t("openAria")}
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/15 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="soft-shortcuts-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] bg-paper px-6 py-7 shadow-soft sm:px-7"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-display italic text-accent">{t("eyebrow")}</p>
            <h2
              id="soft-shortcuts-title"
              className="mt-2 font-display text-2xl tracking-tight"
            >
              {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed">
              <li className="flex gap-3">
                <kbd className="mt-0.5 inline-flex min-w-8 shrink-0 justify-center rounded-full bg-cream px-2 py-0.5 font-display text-xs text-muted">
                  ?
                </kbd>
                <span>{t("toggleHelp")}</span>
              </li>
              <li className="flex gap-3">
                <kbd className="mt-0.5 inline-flex min-w-8 shrink-0 justify-center rounded-full bg-cream px-2 py-0.5 font-display text-xs text-muted">
                  Esc
                </kbd>
                <span>{t("escape")}</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex min-w-8 shrink-0 justify-center rounded-full bg-mint/70 px-2 py-0.5 font-display text-xs text-muted">
                  ·
                </span>
                <span>{t("quiet")}</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex min-w-8 shrink-0 justify-center rounded-full bg-peach/80 px-2 py-0.5 font-display text-xs text-muted">
                  ·
                </span>
                <span>{t("filters")}</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-7 inline-flex min-h-11 items-center rounded-full bg-cream px-5 py-2.5 text-sm shadow-card"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
