"use client";

import { Link } from "@/i18n/navigation";
import { deskEdgeLinks, leaveDeskPath, weekPausePath } from "@/lib/desk-edges";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import { useTranslations } from "next-intl";

export function DeskEdges({
  signedIn,
  variant,
}: {
  signedIn: boolean;
  variant: "account" | "footer" | "beside-pause";
}) {
  const t = useTranslations("DeskEdges");
  const links = deskEdgeLinks(signedIn);

  if (variant === "beside-pause") {
    if (!links.includes("leave")) return null;
    return (
      <p className="mt-4 text-sm leading-relaxed text-muted" data-desk-edges="beside-pause">
        {t("leaveBeside")}{" "}
        <Link href={leaveDeskPath()} className={`${SOFT_CHROME_FOCUS} rounded-full text-accent`}>
          {t("leave")}
        </Link>
      </p>
    );
  }

  if (variant === "footer") {
    return (
      <nav
        className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2"
        aria-label={t("navLabel")}
        data-desk-edges="footer"
      >
        {links.map((edge, index) => (
          <span key={edge} className="inline-flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <Link
              href={edge === "pause" ? weekPausePath() : leaveDeskPath()}
              className={`${SOFT_CHROME_FOCUS} rounded-full hover:text-foreground`}
              data-desk-edge={edge}
            >
              {edge === "pause" ? t("pause") : t("leave")}
            </Link>
          </span>
        ))}
      </nav>
    );
  }

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-blush/40 px-5 py-5"
      data-desk-edges="account"
      aria-labelledby="desk-edges-title"
    >
      <h2 id="desk-edges-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.includes("pause") ? (
          <Link
            href={weekPausePath()}
            data-desk-edge="pause"
            className={`${SOFT_CHROME_FOCUS} inline-flex min-h-11 items-center rounded-full bg-paper px-4 py-2 text-sm shadow-card`}
          >
            {t("pause")}
          </Link>
        ) : null}
        {links.includes("leave") ? (
          <Link
            href={leaveDeskPath()}
            data-desk-edge="leave"
            className={`${SOFT_CHROME_FOCUS} inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 py-2 text-sm text-muted`}
          >
            {t("leave")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
