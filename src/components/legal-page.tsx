import { SoftSecurityNote } from "@/components/soft-security-note";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function LegalPage({
  namespace,
}: {
  namespace: "Privacy" | "Terms" | "Guidelines";
}) {
  const t = await getTranslations(namespace);
  const sections = [
    { title: t("s1Title"), body: t("s1Body") },
    { title: t("s2Title"), body: t("s2Body") },
    { title: t("s3Title"), body: t("s3Body") },
    { title: t("s4Title"), body: t("s4Body") },
    { title: t("s5Title"), body: t("s5Body") },
    { title: t("s6Title"), body: t("s6Body") },
  ];

  return (
    <article className="pt-6">
      <p className="text-sm text-muted">{t("updated")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.75rem] bg-paper px-6 py-6 shadow-card sm:px-8">
            <h2 className="font-display text-2xl tracking-tight">{section.title}</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap leading-relaxed text-muted">
              {section.body}
            </p>
          </section>
        ))}
      </div>
      {namespace === "Terms" ? (
        <p className="mt-8 text-sm text-muted">
          <Link href="/guidelines" className="text-accent hover:text-foreground">
            {t("guidelinesLink")}
          </Link>
        </p>
      ) : null}
      {namespace === "Guidelines" ? (
        <>
          <SoftSecurityNote />
          <p className="mt-8 text-sm text-muted">
            <Link href="/terms" className="text-accent hover:text-foreground">
              {t("termsLink")}
            </Link>
          </p>
        </>
      ) : null}
      <p className="mt-10 text-sm text-muted">
        <Link href="/" className="text-accent hover:text-foreground">
          {t("home")}
        </Link>
      </p>
    </article>
  );
}
