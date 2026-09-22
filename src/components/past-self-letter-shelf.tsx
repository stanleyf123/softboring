import { Link } from "@/i18n/navigation";
import { pastSelfWeekKey } from "@/lib/past-self-letter";
import { getTranslations } from "next-intl/server";

export type PastSelfShelfLetter = {
  id: string;
  reviewId: string;
  body: string;
  reviewCreatedAt: string;
  summary: string;
};

export async function PastSelfLetterShelf({
  signedIn,
  softPlus,
  letters,
  timeZone,
}: {
  signedIn: boolean;
  softPlus: boolean;
  letters: PastSelfShelfLetter[];
  timeZone?: string | null;
}) {
  const t = await getTranslations("PastLetter");
  const shown = letters.slice(0, 6);

  if (!signedIn) {
    return (
      <section
        className="mb-8 rounded-[1.75rem] bg-cream px-6 py-6 shadow-card sm:px-8"
        data-past-self-shelf="guest"
      >
        <p className="font-display text-lg tracking-tight">{t("teaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/history" } }}
          className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section
        className="mb-8 rounded-[1.75rem] bg-cream px-6 py-6 shadow-card sm:px-8"
        data-past-self-shelf="tease"
      >
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p className="mt-1 font-display text-lg tracking-tight">{t("teaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("teaseBody")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inApp")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  return (
    <section
      className="mb-8 rounded-[1.75rem] bg-cream/90 px-6 py-6 shadow-card sm:px-8"
      data-past-self-shelf="open"
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p className="mt-1 font-display text-lg tracking-tight">{t("archiveTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("archiveLead")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("inApp")}</p>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("archiveEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((letter) => {
            const excerpt = Array.from(letter.body).slice(0, 96).join("");
            const clipped = Array.from(letter.body).length > 96;
            const created = new Date(letter.reviewCreatedAt);
            const weekKey = Number.isNaN(created.getTime())
              ? ""
              : pastSelfWeekKey(created, timeZone);
            const summary = letter.summary.trim();
            return (
              <li key={letter.id} className="rounded-[1.25rem] bg-paper/80 px-4 py-3">
                {weekKey ? (
                  <p className="text-xs text-muted">{t("weekLabel", { week: weekKey })}</p>
                ) : null}
                <p className="mt-1 text-sm leading-relaxed">
                  {summary || t("quietWeek")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {excerpt}
                  {clipped ? "…" : ""}
                </p>
                <Link
                  href={`/history/${letter.reviewId}#past-self-letter`}
                  className="mt-2 inline-flex text-sm text-accent"
                >
                  {t("openWeek")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/account"
        className="mt-4 inline-flex text-sm text-accent"
        data-past-letter-inbox-link
      >
        {t("inboxLink")}
      </Link>
    </section>
  );
}
