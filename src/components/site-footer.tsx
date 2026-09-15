import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mx-auto mt-auto w-full max-w-3xl px-6 py-10 text-sm text-muted">
      {t("note")}
    </footer>
  );
}
