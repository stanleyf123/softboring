"use client";

import { subscribeWallRateToast } from "@/lib/wall-rate-notice";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const TOAST_MS = 6400;

/** Cream notice when a Soft Wall request comes back limited. Not an alert. */
export function WallRateToast() {
  const t = useTranslations("WallRate");
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(0);

  useEffect(() => {
    return subscribeWallRateToast(() => {
      setOpen(true);
      setToken((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [open, token]);

  if (!open) return null;

  return (
    <div
      className="soft-rate-toast"
      role="status"
      aria-live="polite"
      data-wall-rate-toast="open"
      data-soft-rate-motion={reducedMotion ? "still" : "soft"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base tracking-tight">{t("title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("body")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-paper px-3 py-1.5 text-sm text-muted shadow-card"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
