import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export type SoftLetterArchiveItem = {
  weekKey: string;
  body: string;
  reviewId: string | null;
};

export async function SoftLetterArchive({
  letters,
}: {
  letters: SoftLetterArchiveItem[];
}) {
  const t = await getTranslations("SoftLetter");
  const shown = letters.slice(0, 6);

  return (
    <section
      className="mb-8 rounded-[1.75rem] bg-blush/40 px-6 py-6 shadow-card sm:px-8"
      data-soft-letter-archive
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p className="mt-1 font-display text-lg tracking-tight">{t("archiveTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("archiveLead")}</p>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("archiveEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((letter) => {
            const excerpt = Array.from(letter.body).slice(0, 96).join("");
            const clipped = Array.from(letter.body).length > 96;
            return (
              <li key={letter.weekKey} className="rounded-[1.25rem] bg-paper/80 px-4 py-3">
                <p className="text-xs text-muted">{t("weekLabel", { week: letter.weekKey })}</p>
                <p className="mt-1 text-sm leading-relaxed">
                  {excerpt}
                  {clipped ? "…" : ""}
                </p>
                {letter.reviewId ? (
                  <Link
                    href={`/history/${letter.reviewId}`}
                    className="mt-2 inline-flex text-sm text-accent"
                  >
                    {t("openWeek")}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/review" className="mt-4 inline-flex text-sm text-accent">
        {t("writeThisWeek")}
      </Link>
    </section>
  );
}
