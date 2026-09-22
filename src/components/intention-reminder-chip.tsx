import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

function excerpt(body: string) {
  const chars = Array.from(body.trim());
  if (chars.length <= 72) return chars.join("");
  return `${chars.slice(0, 72).join("")}…`;
}

/** Quiet home chip for a signed-in member who already set this week's intention. */
export async function IntentionReminderChip({
  body,
  weekKey,
}: {
  body: string;
  weekKey: string;
}) {
  const trimmed = body.trim();
  if (!trimmed) return null;

  const t = await getTranslations("IntentionChip");
  const shown = excerpt(trimmed);

  return (
    <Link
      href="/review#soft-intention"
      data-intention-chip
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-line/80 bg-lemon/60 px-4 py-2 text-sm text-foreground shadow-card hover:bg-lemon/80"
      aria-label={t("aria", { body: shown })}
    >
      <span aria-hidden="true">✿</span>
      <span className="min-w-0 truncate">
        <span className="text-muted">{t("kicker")}</span>
        <span className="mx-1.5 text-muted/70" aria-hidden="true">
          ·
        </span>
        <span>{shown}</span>
      </span>
      <span className="sr-only">{t("week", { week: weekKey })}</span>
    </Link>
  );
}
