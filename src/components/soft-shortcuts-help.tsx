"use client";

import { usePathname } from "@/i18n/navigation";
import { readQuietWriting, writeQuietWriting } from "@/lib/quiet-writing";
import {
  isTypingTarget,
  softShortcutAction,
  softShortcutSurface,
  type SoftShortcutSurface,
} from "@/lib/soft-shortcuts";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function isHelpPath(pathname: string) {
  return softShortcutSurface(pathname) !== "other";
}

function ShortcutRow({
  keys,
  children,
}: {
  keys: string;
  children: string;
}) {
  return (
    <li className="flex gap-3">
      <kbd className="mt-0.5 inline-flex min-w-8 shrink-0 justify-center rounded-full bg-paper px-2 py-0.5 font-display text-xs text-muted shadow-card">
        {keys}
      </kbd>
      <span>{children}</span>
    </li>
  );
}

/** Soft ? help sheet on Soft Wall and review. Free. */
export function SoftShortcutsHelp() {
  const t = useTranslations("Shortcuts");
  const pathname = usePathname();
  const surface: SoftShortcutSurface = softShortcutSurface(pathname);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const onPath = isHelpPath(pathname);
  const open = onPath && openPath === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => {
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!onPath) return;

    function onKeyDown(event: KeyboardEvent) {
      const action = softShortcutAction({
        key: event.key,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        repeat: event.repeat,
        typing: isTypingTarget(event.target),
        surface,
        helpOpen: open,
      });
      if (!action) return;

      if (action === "close-help") {
        event.preventDefault();
        event.stopPropagation();
        setOpenPath(null);
        return;
      }
      if (action === "toggle-help") {
        event.preventDefault();
        event.stopPropagation();
        setOpenPath((current) => (current === pathname ? null : pathname));
        return;
      }
      if (action === "quiet-writing") {
        event.preventDefault();
        writeQuietWriting(!readQuietWriting());
        return;
      }
      if (action === "wall-search") {
        const field = document.querySelector<HTMLElement>("[data-wall-search]");
        if (!field) return;
        event.preventDefault();
        field.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onPath, open, surface, pathname]);

  if (!onPath) return null;

  function trapTab(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const root = event.currentTarget;
    const items = [...root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter(
      (el) => !el.hasAttribute("disabled"),
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpenPath(pathname)}
        className="fixed bottom-24 right-4 z-[55] inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper/95 text-sm text-muted shadow-card hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:bottom-6"
        aria-label={t("openAria")}
        aria-expanded={open}
        aria-controls="soft-shortcuts-sheet"
        title={t("openAria")}
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/15 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpenPath(null)}
        >
          <div
            ref={panelRef}
            id="soft-shortcuts-sheet"
            data-shortcuts-sheet
            data-shortcuts-surface={surface}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="soft-shortcuts-title"
            aria-describedby="soft-shortcuts-lead"
            className="soft-shortcuts-sheet max-h-[min(40rem,calc(100vh-2rem))] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-paper px-6 py-7 shadow-soft outline-none sm:px-8"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapTab}
          >
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-peach" />
              <span className="h-3 w-3 rounded-full bg-blush" />
              <span className="h-3 w-3 rounded-full bg-mint" />
            </div>
            <p className="mt-4 font-display italic text-accent">{t("eyebrow")}</p>
            <h2 id="soft-shortcuts-title" className="mt-2 font-display text-3xl tracking-tight">
              {t("title")}
            </h2>
            <p id="soft-shortcuts-lead" className="mt-2 text-sm leading-relaxed text-muted">
              {t("lead")}
            </p>

            <section className="mt-6 rounded-[1.5rem] bg-cream/80 px-4 py-4" data-shortcut-group="shared">
              <h3 className="font-display text-lg tracking-tight">{t("groupShared")}</h3>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                <ShortcutRow keys="?">{t("toggleHelp")}</ShortcutRow>
                <ShortcutRow keys="Esc">{t("escape")}</ShortcutRow>
              </ul>
            </section>

            <section
              className={`mt-3 rounded-[1.5rem] px-4 py-4 ${
                surface === "review" ? "bg-blush/70" : "bg-blush/35"
              }`}
              data-shortcut-group="review"
              data-shortcut-current={surface === "review" ? "1" : "0"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg tracking-tight">{t("groupReview")}</h3>
                {surface === "review" ? (
                  <span className="rounded-full bg-paper/80 px-2.5 py-0.5 text-xs text-muted">{t("here")}</span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                <ShortcutRow keys="Q">{t("quiet")}</ShortcutRow>
              </ul>
            </section>

            <section
              className={`mt-3 rounded-[1.5rem] px-4 py-4 ${
                surface === "wall" ? "bg-mint/70" : "bg-mint/35"
              }`}
              data-shortcut-group="wall"
              data-shortcut-current={surface === "wall" ? "1" : "0"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg tracking-tight">{t("groupWall")}</h3>
                {surface === "wall" ? (
                  <span className="rounded-full bg-paper/80 px-2.5 py-0.5 text-xs text-muted">{t("here")}</span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                <ShortcutRow keys="/">{t("search")}</ShortcutRow>
                <ShortcutRow keys="← →">{t("weekChips")}</ShortcutRow>
                <ShortcutRow keys="[ ]">{t("feelingFloor")}</ShortcutRow>
                <ShortcutRow keys="{ }">{t("feelingCeiling")}</ShortcutRow>
                <li className="text-muted">{t("filters")}</li>
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setOpenPath(null)}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-cream px-5 py-2.5 text-sm shadow-card"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
