import { SoftMark } from "@/components/soft-doodles";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mx-auto mt-auto w-full max-w-3xl px-6 py-10 text-sm text-muted">
      <span className="inline-flex items-center gap-2">
        <SoftMark className="h-6 w-6" />
        {t("note")}
      </span>
    </footer>
  );
}
