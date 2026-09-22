import { ReviewForm } from "@/components/review-form";
import { SoftFocusTimer } from "@/components/soft-focus-timer";
import { SoftPauseCard } from "@/components/soft-pause-card";
import { SoftRhythmCard } from "@/components/soft-rhythm-card";
import { QuietWritingToggle } from "@/components/quiet-writing";
import {
  LastIntentionNudge,
  SoftIntentionCard,
} from "@/components/soft-intention-card";
import { SoftLetterCard } from "@/components/soft-letter-card";
import { SoftNoteCard } from "@/components/soft-note-card";
import { ensureUserSettings } from "@/db/user-settings";
import { currentPauseWeekKey, isWeekPaused } from "@/db/week-pauses";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { userIsSoftPlus } from "@/lib/plan";
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
    title: t("reviewTitle"),
    description: t("reviewDescription"),
    path: "/review",
  });
}

export default async function ReviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const t = await getTranslations("Review");
  const user = await getCurrentUser();
  const settings = user ? ensureUserSettings(user.id) : null;
  const pauseWeekKey = settings ? currentPauseWeekKey(new Date(), settings.timezone) : "";
  const paused = user && pauseWeekKey ? isWeekPaused(user.id, pauseWeekKey) : false;
  const softPlus = userIsSoftPlus(user);
  const customQuestions = settings && softPlus ? settings.customQuestions : [];

  return (
    <div className="pt-6">
      <div className="quiet-writing-chrome flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-lg">
          <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{t("lead")}</p>
        </div>
        <QuietWritingToggle />
      </div>
      <div className="quiet-writing-chrome mt-8 space-y-4">
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
        <LastIntentionNudge signedIn={Boolean(user)} />
        <SoftIntentionCard signedIn={Boolean(user)} />
        <SoftNoteCard signedIn={Boolean(user)} />
        <SoftLetterCard signedIn={Boolean(user)} softPlus={softPlus} />
      </div>
      <div className="mt-8">
        <SoftFocusTimer
          signedIn={Boolean(user)}
          initialMinutes={settings?.focusMinutes}
          initialChime={settings?.focusChime}
        />
      </div>
      <div className="mt-10">
        <ReviewForm
          signedIn={Boolean(user)}
          softPlus={softPlus}
          customQuestions={customQuestions}
        />
      </div>
    </div>
  );
}
