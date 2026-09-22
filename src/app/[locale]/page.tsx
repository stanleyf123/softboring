import { GratitudeJarCard } from "@/components/gratitude-jar-card";
import { SoftCapsuleCard } from "@/components/soft-capsule-card";
import { IntentionReminderChip } from "@/components/intention-reminder-chip";
import { MemoryLaneCard } from "@/components/memory-lane-card";
import { SoftMemoryCard } from "@/components/soft-memory-card";
import { SoftPauseCard } from "@/components/soft-pause-card";
import { StreakProtectChip } from "@/components/streak-protect-chip";
import { SoftRhythmCard } from "@/components/soft-rhythm-card";
import { SoftWeekWeather } from "@/components/soft-week-weather";
import { SampleReviewCard } from "@/components/sample-review-card";
import { HeroDoodle } from "@/components/soft-doodles";
import { PublicWallCounter } from "@/components/public-wall-counter";
import { HomeSoftStats } from "@/components/soft-stats-strip";
import { publicSoftStats } from "@/db/soft-stats";
import { listReviewsForOwner } from "@/db/reviews";
import { getCurrentSoftIntention } from "@/db/soft-intentions";
import { listOwnWallSnippets } from "@/db/wall";
import { ensureUserSettings } from "@/db/user-settings";
import { readStreakProtect } from "@/db/streak-protect";
import { currentPauseWeekKey, isWeekPaused } from "@/db/week-pauses";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { userIsSoftPlus } from "@/lib/plan";
import { pickMemoryLane } from "@/lib/memory-lane";
import { moodForCurrentWeek } from "@/lib/soft-weather";
import { pickSoftMemory } from "@/lib/soft-memory";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("homeTitle"),
    description: t("homeDescription"),
    path: "/",
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Home");
  const user = await getCurrentUser();
  const settings = user ? ensureUserSettings(user.id) : null;
  const pauseWeekKey = settings ? currentPauseWeekKey(new Date(), settings.timezone) : "";
  const paused = user && pauseWeekKey ? isWeekPaused(user.id, pauseWeekKey) : false;
  const softPlus = userIsSoftPlus(user);
  const publicStats = publicSoftStats();
  const intention = user ? getCurrentSoftIntention(user.id) : null;
  const reviews = user
    ? listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" })
    : [];
  const memory = user ? pickSoftMemory(reviews, softPlus) : null;
  const weekMood =
    user && settings
      ? moodForCurrentWeek({
          reviews,
          weekKey: pauseWeekKey,
          timeZone: settings.timezone,
        })
      : null;
  const lane =
    user && settings
      ? pickMemoryLane({
          enabled: settings.memoryLane,
          reviewsNewestFirst: reviews,
          notes: listOwnWallSnippets(user.id),
          softPlus,
          timeZone: settings.timezone,
        })
      : null;

  return (
    <div className="pt-2">
      <section
        className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between lg:gap-16"
        aria-labelledby="home-title"
      >
        <div className="max-w-lg lg:max-w-xl">
          <p className="font-display italic text-accent">{t("eyebrow")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li className="rounded-full bg-peach px-3 py-1 text-sm">
              {t("chipOnce")}
            </li>
            <li className="rounded-full bg-mint px-3 py-1 text-sm">
              {t("chipQuestions")}
            </li>
            <li className="rounded-full bg-blush px-3 py-1 text-sm">
              {t("chipNotTodo")}
            </li>
          </ul>
          <h1
            id="home-title"
            className="mt-5 font-display text-4xl leading-tight tracking-tight md:text-5xl"
          >
            {t("title")}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{t("lead")}</p>
          <Link
            href="/review"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3 text-paper shadow-soft"
          >
            {t("cta")}
          </Link>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted shadow-card hover:text-foreground"
            >
              {t("ctaPricing")}
            </Link>
            <Link
              href="/wall"
              className="inline-flex min-h-11 items-center rounded-full bg-blush/80 px-5 py-2.5 text-sm shadow-card hover:text-foreground"
            >
              {t("ctaWall")}
            </Link>
          </div>
          <PublicWallCounter
            count={publicStats.publicWallNotes}
            label={t("wallCountLabel")}
            ariaLabel={t("wallCountAria", { count: publicStats.publicWallNotes })}
          />
          {intention ? (
            <div className="mt-5">
              <IntentionReminderChip body={intention.body} weekKey={intention.weekKey} />
            </div>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-[17.5rem] shrink-0 sm:mx-0 sm:max-w-[15.5rem] md:max-w-[17.5rem] lg:max-w-[22rem]">
          <HeroDoodle />
        </div>
      </section>

      <div className="mt-10 space-y-4">
        <SoftWeekWeather
          signedIn={Boolean(user)}
          initialPaused={paused}
          mood={weekMood}
          weekKey={user ? pauseWeekKey : ""}
        />
        {user ? <StreakProtectChip initial={readStreakProtect(user.id, softPlus)} /> : null}
        <SoftPauseCard
          signedIn={Boolean(user)}
          initialWeekKey={pauseWeekKey}
          initialPaused={paused}
        />
        {settings ? (
          <SoftRhythmCard
            reminderWeekday={settings.reminderWeekday}
            reminderEnabled={settings.reminderEnabled}
            timezone={settings.timezone}
          />
        ) : null}
        {user ? <GratitudeJarCard signedIn softPlus={softPlus} /> : null}
        {user ? <SoftCapsuleCard signedIn softPlus={softPlus} /> : null}
      </div>

      <HomeSoftStats
        labels={{
          aria: t("statsAria"),
          wallWeek: t("statsWallWeek"),
          wallPublic: t("statsWallPublic"),
          languages: t("statsLanguages"),
          note: t("statsNote"),
        }}
      />

      {lane ? <MemoryLaneCard lane={lane} /> : null}
      {memory ? <SoftMemoryCard memory={memory} /> : null}

      <section className="mt-16" aria-labelledby="home-sample">
        <p className="font-display text-sm italic text-muted">{t("sampleKicker")}</p>
        <h2
          id="home-sample"
          className="mt-2 font-display text-2xl tracking-tight sm:text-3xl"
        >
          {t("sampleHeading")}
        </h2>
        <p className="mt-3 max-w-lg leading-relaxed text-muted">
          {t("sampleLead")}
        </p>
        <div className="mt-8">
          <SampleReviewCard />
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3 lg:gap-6" aria-label={t("ideasLabel")}>
        <IdeaCard title={t("ideaOneTitle")} body={t("ideaOneBody")} wash="bg-peach/80" />
        <IdeaCard title={t("ideaTwoTitle")} body={t("ideaTwoBody")} wash="bg-blush/80" />
        <IdeaCard title={t("ideaThreeTitle")} body={t("ideaThreeBody")} wash="bg-mint/80" />
      </section>

      <section
        className="mt-16 rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8"
        aria-labelledby="home-pricing"
      >
        <h2 id="home-pricing" className="font-display text-2xl tracking-tight">
          {t("pricingTitle")}
        </h2>
        <p className="mt-4 leading-relaxed text-muted">{t("pricingFree")}</p>
        <p className="mt-2 leading-relaxed text-muted">{t("pricingPaid")}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("pricingCta")}
        </Link>
      </section>

      <section
        className="mt-14 rounded-[1.75rem] bg-blush/70 px-6 py-8 text-center shadow-card sm:px-8"
        aria-labelledby="home-bottom"
      >
        <h2 id="home-bottom" className="font-display text-2xl tracking-tight">
          {t("bottomTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
          {t("bottomBody")}
        </p>
        <Link
          href="/review"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3 text-paper shadow-soft"
        >
          {t("cta")}
        </Link>
      </section>
    </div>
  );
}

function IdeaCard({
  title,
  body,
  wash,
}: {
  title: string;
  body: string;
  wash: string;
}) {
  return (
    <div className={`rounded-[1.75rem] ${wash} px-5 py-6 shadow-card`}>
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
