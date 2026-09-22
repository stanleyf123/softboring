"use client";

import { claimPresencePing, resetPresencePingClaim, type PresenceBand, type PresencePublic } from "@/lib/wall-presence";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const BANDS: PresenceBand[] = ["quiet", "one", "few", "circle", "many"];

function isBand(value: unknown): value is PresenceBand {
  return typeof value === "string" && (BANDS as string[]).includes(value);
}

function readPresence(data: unknown): PresencePublic | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { windowHours?: unknown; neighbors?: unknown; band?: unknown };
  if (!isBand(record.band)) return null;
  if (typeof record.neighbors !== "number" || !Number.isFinite(record.neighbors)) return null;
  const windowHours =
    typeof record.windowHours === "number" && record.windowHours > 0 ? record.windowHours : 6;
  return {
    windowHours,
    neighbors: Math.max(0, Math.floor(record.neighbors)),
    band: record.band,
  };
}

export function NeighborPresence() {
  const t = useTranslations("NeighborPresence");
  const hydrated = useHydrated();
  const [view, setView] = useState<PresencePublic | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const count = claimPresencePing();
    void (async () => {
      try {
        const response = await fetch("/api/wall/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count }),
        });
        if (!response.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const parsed = readPresence(await response.json());
        if (!cancelled) {
          if (!parsed) setFailed(true);
          else {
            setFailed(false);
            setView(parsed);
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      window.setTimeout(resetPresencePingClaim, 0);
    };
  }, [hydrated]);

  const band = failed ? "error" : (view?.band ?? "loading");
  const line = failed
    ? t("error")
    : view
      ? t(view.band)
      : t("loading");

  return (
    <section
      className="mt-4 max-w-lg rounded-[1.5rem] bg-mint/55 px-4 py-3 shadow-card"
      data-neighbor-presence={band}
      aria-live="polite"
    >
      <p className="text-xs text-accent">{t("kicker")}</p>
      <p className="mt-1 font-display text-lg tracking-tight">{line}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {t("window", { hours: view?.windowHours ?? 6 })}
      </p>
    </section>
  );
}
