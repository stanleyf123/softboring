import { Link } from "@/i18n/navigation";
import { softSecurityHeaders } from "@/lib/security-headers";
import { getTranslations } from "next-intl/server";

/** Guidelines note: the same headers `next.config` sends, so the page can be checked. */
export async function SoftSecurityNote() {
  const t = await getTranslations("Guidelines");
  const headers = softSecurityHeaders();

  return (
    <section
      id="quiet-headers"
      data-soft-security=""
      className="mt-8 rounded-[1.75rem] bg-paper px-6 py-6 shadow-card sm:px-8"
      aria-labelledby="quiet-headers-title"
    >
      <h2 id="quiet-headers-title" className="font-display text-2xl tracking-tight">
        {t("securityTitle")}
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t("securityLead")}</p>
      <ul className="mt-5 space-y-3" aria-label={t("securityListLabel")}>
        {headers.map((header) => (
          <li
            key={header.key}
            data-security-header={header.key}
            className="rounded-[1.25rem] bg-cream/80 px-4 py-3"
          >
            <p className="text-sm text-foreground">{header.key}</p>
            <p className="mt-1 break-all text-sm leading-relaxed text-muted">{header.value}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted">
        <Link href="/privacy" className="text-accent hover:text-foreground">
          {t("privacyLink")}
        </Link>
      </p>
    </section>
  );
}
