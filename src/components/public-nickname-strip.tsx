import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function PublicNicknameStrip({ nicknames }: { nicknames: string[] }) {
  const t = await getTranslations("PublicNicknames");

  return (
    <section
      className="mt-10 rounded-[1.75rem] bg-cream/90 px-5 py-5 shadow-card sm:px-6"
      aria-labelledby="public-nicknames-title"
      data-public-nicknames={nicknames.length === 0 ? "empty" : "open"}
    >
      <p id="public-nicknames-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      {nicknames.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {nicknames.map((name) => (
            <li
              key={name.toLocaleLowerCase()}
              className="rounded-full bg-blush/80 px-3 py-1 text-sm"
              data-public-nickname
            >
              {name}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
      <Link href="/wall" className="mt-3 inline-flex text-sm text-accent">
        {t("wall")}
      </Link>
    </section>
  );
}
