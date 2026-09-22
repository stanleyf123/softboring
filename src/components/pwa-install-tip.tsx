"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export const PWA_INSTALL_TIP_KEY = "softboring.pwaInstallTipDismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type TipSurface = "hidden" | "ios" | "browser";

function alreadyInstalled() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function dismissedAlready() {
  try {
    return window.localStorage.getItem(PWA_INSTALL_TIP_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(PWA_INSTALL_TIP_KEY, "1");
  } catch {
    // Private mode can refuse storage. The tip still closes for this visit.
  }
}

function isMobileSurface() {
  return window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1024px)")
    .matches;
}

function isIosAddToHome() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function tipSurface(): TipSurface {
  if (alreadyInstalled() || dismissedAlready() || !isMobileSurface()) return "hidden";
  if (isIosAddToHome()) return "ios";
  return "browser";
}

function subscribeTipSurface() {
  return () => {};
}

export function PwaInstallTip() {
  const t = useTranslations("Pwa");
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const surface = useSyncExternalStore(subscribeTipSurface, tipSurface, () => "hidden" as const);

  useEffect(() => {
    if (surface !== "browser" || closed) return;

    function onPrompt(event: Event) {
      event.preventDefault();
      promptRef.current = event as BeforeInstallPromptEvent;
      setPromptReady(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [surface, closed]);

  function dismiss() {
    rememberDismissed();
    promptRef.current = null;
    setClosed(true);
    setPromptReady(false);
  }

  async function install() {
    const prompt = promptRef.current;
    if (!prompt) {
      dismiss();
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // The browser may refuse a second prompt. Closing is enough.
    }
    dismiss();
  }

  const mode = closed ? null : surface === "ios" ? "ios" : promptReady ? "prompt" : null;
  if (!mode) return null;

  return (
    <aside
      className="fixed inset-x-3 z-40 rounded-[1.5rem] bg-paper px-4 py-3 shadow-card print:hidden md:hidden bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
      aria-label={t("title")}
    >
      <p className="font-display text-base tracking-tight">{t("title")}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {mode === "ios" ? t("iosBody") : t("body")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "prompt" ? (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
          >
            {t("install")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("dismiss")}
        </button>
      </div>
    </aside>
  );
}
