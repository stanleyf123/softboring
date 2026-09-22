import { SoftMark } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className={`${SITE_SHELL_CLASS} mt-auto pb-24 pt-10 text-sm text-muted print:hidden md:py-10`}>
      <span className="inline-flex items-center gap-2">
        <SoftMark className="h-6 w-6" />
        {t("note")}
      </span>
      <p className="mt-3 max-w-md leading-relaxed">{t("thanks")}</p>
      <nav className="mt-3 flex flex-wrap gap-3" aria-label={t("navLabel")}>
        <Link href="/thanks" className="hover:text-foreground">
          {t("thanksLink")}
        </Link>
        <Link href="/guidelines" className="hover:text-foreground">
          {t("guidelines")}
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          {t("privacy")}
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}
