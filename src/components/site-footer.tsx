import { LocaleSwitcher } from "@/components/locale-switcher";
import { SoftMark } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
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
      <p className="mt-3">
        <Link href="/thanks" className={`${SOFT_CHROME_FOCUS} rounded-full hover:text-foreground`}>
          {t("thanksLink")}
        </Link>
      </p>
      <nav
        className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2"
        aria-label={t("navLabel")}
      >
        <Link href="/guidelines" className={`${SOFT_CHROME_FOCUS} rounded-full hover:text-foreground`}>
          {t("guidelines")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className={`${SOFT_CHROME_FOCUS} rounded-full hover:text-foreground`}>
          {t("privacy")}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className={`${SOFT_CHROME_FOCUS} rounded-full hover:text-foreground`}>
          {t("terms")}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="inline-flex basis-full flex-wrap items-center gap-2 rounded-[1.25rem] bg-cream/80 px-3 py-2">
          <span className="text-foreground">{t("languages")}</span>
          <LocaleSwitcher variant="footer" />
        </span>
      </nav>
    </footer>
  );
}
