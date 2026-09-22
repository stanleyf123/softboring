"use client";

import {
  BACK_ONLINE_MS,
  initialOfflinePhase,
  nextOfflinePhase,
  offlineBannerMotion,
  type OfflineBannerPhase,
} from "@/lib/soft-offline";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

type OfflineSnapshot = { phase: OfflineBannerPhase };

const SERVER_SNAPSHOT: OfflineSnapshot = { phase: "hidden" };
let snapshot: OfflineSnapshot = SERVER_SNAPSHOT;
let listening = false;
const listeners = new Set<() => void>();

function publish(phase: OfflineBannerPhase) {
  if (snapshot.phase === phase) return;
  snapshot = { phase };
  for (const listener of listeners) listener();
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  publish(initialOfflinePhase(navigator.onLine));
  window.addEventListener("online", () => publish(nextOfflinePhase(snapshot.phase, true)));
  window.addEventListener("offline", () => publish(nextOfflinePhase(snapshot.phase, false)));
}

function subscribeOffline(onStoreChange: () => void) {
  ensureListening();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function settleBackOnline() {
  if (snapshot.phase === "back") publish("hidden");
}

export function SoftOfflineBanner() {
  const t = useTranslations("SoftOffline");
  const reducedMotion = usePrefersReducedMotion();
  const { phase } = useSyncExternalStore(subscribeOffline, () => snapshot, () => SERVER_SNAPSHOT);
  const [dismissedPhase, setDismissedPhase] = useState<OfflineBannerPhase | null>(null);

  useEffect(() => {
    if (phase !== "back") return;
    const id = window.setTimeout(settleBackOnline, BACK_ONLINE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "hidden" || dismissedPhase === phase) return null;

  const offline = phase === "offline";

  return (
    <div className={`${SITE_SHELL_CLASS} sticky top-3 z-30 print:hidden`}>
      <aside
        className="soft-offline-banner rounded-[1.5rem] bg-cream px-4 py-3 shadow-card"
        role="status"
        aria-live="polite"
        data-soft-offline={phase}
        data-soft-offline-motion={offlineBannerMotion(reducedMotion)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-base tracking-tight">
              {offline ? t("offlineTitle") : t("backTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {offline ? t("offlineBody") : t("backBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedPhase(phase)}
            className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-muted"
          >
            {t("dismiss")}
          </button>
        </div>
      </aside>
    </div>
  );
}
