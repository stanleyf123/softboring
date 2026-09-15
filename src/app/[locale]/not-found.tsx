import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="pt-16">
      <h1 className="font-display text-3xl tracking-tight">{t("title")}</h1>
      <Link href="/" className="mt-6 inline-block text-sm text-accent">
        {t("home")}
      </Link>
    </div>
  );
}
