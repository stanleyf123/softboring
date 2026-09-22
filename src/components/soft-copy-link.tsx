"use client";

import {
  COPY_TOAST_MS,
  copyShareText,
  resolveShareHref,
  type SoftShareKind,
} from "@/lib/soft-copy-link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function fallbackCopy(text: string) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function SoftCopyLink({
  kind,
  path = null,
  href = null,
}: {
  kind: SoftShareKind;
  path?: string | null;
  href?: string | null;
}) {
  const t = useTranslations("SoftCopy");
  const [toast, setToast] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const hint =
    kind === "postcard" ? t("hintPostcard") : kind === "wall-note" ? t("hintWall") : t("hintInvite");

  if (!path && !href) return null;

  async function onCopy() {
    const target = resolveShareHref({
      href,
      path,
      origin: window.location.origin,
    });
    if (!target) {
      setError(true);
      setToast(false);
      return;
    }
    const copied = await copyShareText(target, navigator.clipboard);
    const ok = copied || fallbackCopy(target);
    if (!ok) {
      setError(true);
      setToast(false);
      return;
    }
    setError(false);
    setToast(true);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(false), COPY_TOAST_MS);
  }

  return (
    <div className="print:hidden" data-soft-copy={kind}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onCopy()}
          data-soft-copy-link={kind}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 py-2 text-sm text-muted shadow-card hover:text-foreground"
        >
          {t("copy")}
        </button>
        <p className="text-xs leading-relaxed text-muted">{hint}</p>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-muted" role="alert">
          {t("copyError")}
        </p>
      ) : null}
      {toast ? (
        <div className="soft-copy-toast" role="status" aria-live="polite" data-soft-copy-toast="open">
          <p className="text-sm leading-relaxed">{t("copied")}</p>
        </div>
      ) : null}
    </div>
  );
}
