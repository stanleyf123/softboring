"use client";

import { readSoftBloomEnabled, saveBloomClasses, writeSoftBloomEnabled } from "@/lib/soft-bloom";
import { useHydrated } from "@/lib/use-hydrated";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

export function SoftSaveBloom({ children }: { children: ReactNode }) {
  const t = useTranslations("Review");
  const reducedMotion = usePrefersReducedMotion();
  const [on, setOn] = useState(() => readSoftBloomEnabled(window.localStorage));
  const bloom = saveBloomClasses(on, reducedMotion);

  function setBloom(next: boolean) {
    writeSoftBloomEnabled(next, window.localStorage);
    setOn(next);
  }

  return (
    <div data-soft-bloom={on ? "on" : "off"} data-soft-bloom-motion={bloom.motion}>
      <div className={bloom.wrap === "soft-save-bloom" ? "soft-save-bloom" : undefined}>
        <div
          className={`rounded-[2rem] bg-paper px-8 py-12 shadow-card ${
            bloom.card === "soft-save-bloom-card" ? "soft-save-bloom-card" : ""
          }`}
        >
          {children}
        </div>
      </div>
      <div className="mt-3 px-1">
        {on ? (
          <button
            type="button"
            onClick={() => setBloom(false)}
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            data-soft-bloom-dismiss
          >
            {t("bloomDismiss")}
          </button>
        ) : (
          <p className="text-sm text-muted">
            {t("bloomQuiet")}{" "}
            <button
              type="button"
              onClick={() => setBloom(true)}
              className="text-accent underline-offset-2 hover:underline"
              data-soft-bloom-restore
            >
              {t("bloomRestore")}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export function SoftBloomPreference() {
  const t = useTranslations("Account");
  const hydrated = useHydrated();

  return (
    <div className="mt-8 rounded-[1.5rem] bg-cream px-5 py-5" data-soft-bloom-preference>
      <p className="font-display text-lg tracking-tight">{t("bloomTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("bloomBody")}</p>
      {hydrated ? <SoftBloomToggle /> : null}
    </div>
  );
}

function SoftBloomToggle() {
  const t = useTranslations("Account");
  const [on, setOn] = useState(() => readSoftBloomEnabled(window.localStorage));

  return (
    <label className="mt-4 flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          const next = event.target.checked;
          setOn(next);
          writeSoftBloomEnabled(next, window.localStorage);
        }}
        className="mt-1 h-4 w-4 rounded border-line accent-accent"
      />
      <span>{t("bloomToggle")}</span>
    </label>
  );
}
