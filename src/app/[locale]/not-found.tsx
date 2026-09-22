import { SoftLostIllustration } from "@/components/soft-lost-illu";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="pt-10" data-soft-not-found="">
      <section className="max-w-lg rounded-[2rem] bg-cream px-8 py-12 shadow-card">
        <SoftLostIllustration />
        <h1 className="mt-6 font-display text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted">{t("body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
          >
            {t("home")}
          </Link>
          <Link
            href="/wall"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted"
          >
            {t("wall")}
          </Link>
        </div>
      </section>
    </div>
  );
}
