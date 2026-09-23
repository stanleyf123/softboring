"use client";

import { useTranslations } from "next-intl";

/** Cream mark so a Soft+ demo account is obvious on Soft Wall. Free to see. */
export function DemoNeighborBadge() {
  const t = useTranslations("Wall");
  return (
    <span className="soft-demo-neighbor" data-demo-neighbor="1" title={t("demoNeighborHint")}>
      {t("demoNeighbor")}
    </span>
  );
}

export function DemoNeighborNote({ className = "" }: { className?: string }) {
  const t = useTranslations("Wall");
  return (
    <p className={className} data-demo-neighbor="1">
      <DemoNeighborBadge />
      <span className="mt-1 block text-xs leading-relaxed text-muted">{t("demoNeighborHint")}</span>
    </p>
  );
}
