import { Link } from "@/i18n/navigation";
import { nicknameWallQuery } from "@/lib/nickname-wall-link";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
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
        <>
          <p className="mt-3 text-xs text-muted" data-public-nickname-count>
            {t("count", { count: nicknames.length })}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {nicknames.map((name) => {
              const nick = nicknameWallQuery(name);
              if (!nick) {
                return (
                  <li key={name.toLocaleLowerCase()} data-public-nickname>
                    <span className="inline-flex rounded-full bg-blush/80 px-3 py-1 text-sm">
                      {name}
                    </span>
                  </li>
                );
              }
              return (
                <li key={nick.toLocaleLowerCase()}>
                  <Link
                    href={{ pathname: "/wall", query: { nick } }}
                    className={`${SOFT_CHROME_FOCUS} inline-flex min-h-11 items-center rounded-full bg-blush/80 px-3 py-1 text-sm`}
                    data-public-nickname
                    aria-label={t("chipAria", { name: nick })}
                  >
                    {nick}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("privacy")}</p>
      <Link href="/wall" className="mt-3 inline-flex text-sm text-accent">
        {t("wall")}
      </Link>
    </section>
  );
}
