import { Link } from "@/i18n/navigation";
import { BOOKMARKS_EXPORT_FILENAME } from "@/lib/bookmarks-export";
import { getTranslations } from "next-intl/server";

export async function WallBookmarksExport({ softPlus }: { softPlus: boolean }) {
  const t = await getTranslations("WallBookmarks");

  if (!softPlus) {
    return (
      <section
        className="rounded-[1.75rem] bg-blush/45 px-5 py-5 shadow-card"
        data-bookmarks-export="tease"
      >
        <p className="font-display text-lg tracking-tight">{t("exportTeaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("exportTeaseBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("exportTeaseCta")}
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-mint/50 px-5 py-5 shadow-card"
      data-bookmarks-export="download"
    >
      <p className="font-display text-lg tracking-tight">{t("exportTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("exportBody")}</p>
      <a
        href="/api/wall/bookmarks/export"
        download={BOOKMARKS_EXPORT_FILENAME}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-paper px-5 py-2.5 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t("exportCta")}
      </a>
    </section>
  );
}
