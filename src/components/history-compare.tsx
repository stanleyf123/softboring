"use client";

import { Link } from "@/i18n/navigation";
import {
  canComparePair,
  compareBridge,
  compareCardWash,
  excerptForCompare,
  feelingDelta,
  feelingMarks,
  fieldPresence,
  toCompareSide,
  type CompareSide,
} from "@/lib/history-compare";
import {
  ensureLocalReviewsMigrated,
  fetchReviews,
  type HistoryReview,
  type ReviewAccessInfo,
} from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

function optionLabel(
  review: HistoryReview,
  format: ReturnType<typeof useFormatter>,
  untitled: string,
) {
  const date = format.dateTime(new Date(review.createdAt), { dateStyle: "medium" });
  const title = review.summary.trim() || untitled;
  const short = Array.from(title).slice(0, 42).join("");
  return `${date} · ${short}${Array.from(title).length > 42 ? "…" : ""}`;
}

const CARD_WASH = {
  cream: "bg-cream",
  blush: "bg-blush/80",
} as const;

function FeelingDots({ feeling }: { feeling: number | null }) {
  const marks = feelingMarks(feeling);
  return (
    <div className="mt-3 flex gap-1.5" data-feeling-marks={feeling ?? "none"} aria-hidden="true">
      {marks.map((mark, index) => (
        <span
          key={index}
          data-feeling-mark={mark}
          className={
            mark === "on"
              ? "h-2.5 w-2.5 rounded-full bg-accent"
              : "h-2.5 w-2.5 rounded-full border border-line bg-paper/70"
          }
        />
      ))}
    </div>
  );
}

function SideCard({
  side,
  label,
  empty,
  place,
}: {
  side: CompareSide | null;
  label: string;
  empty: string;
  place: "left" | "right";
}) {
  const t = useTranslations("HistoryCompare");
  const tQuestions = useTranslations("Questions");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const wash = compareCardWash(place);

  if (!side) {
    return (
      <section
        data-compare-card={wash}
        data-compare-side={place}
        className={`rounded-[1.75rem] px-5 py-8 shadow-card sm:px-6 ${CARD_WASH[wash]}`}
      >
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{empty}</p>
      </section>
    );
  }

  return (
    <section
      data-compare-card={wash}
      data-compare-side={place}
      className={`rounded-[1.75rem] px-5 py-6 shadow-card sm:px-6 ${CARD_WASH[wash]}`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-sm text-muted">
        {format.dateTime(new Date(side.createdAt), { dateStyle: "long" })}
      </p>
      <h2 className="mt-3 font-display text-2xl tracking-tight">
        {side.summary || tHistory("untitled")}
      </h2>
      <FeelingDots feeling={side.feeling} />
      <p className="mt-3 text-sm text-muted">
        {side.feeling
          ? tHistory("feeling", { value: side.feeling })
          : t("noFeeling")}
      </p>
      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-sm text-muted">{tQuestions("energy")}</dt>
          <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {excerptForCompare(side.energy) || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{tQuestions("drain")}</dt>
          <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {excerptForCompare(side.drain) || "—"}
          </dd>
        </div>
      </dl>
      <Link href={`/history/${side.id}`} className="mt-6 inline-block text-sm text-accent">
        {t("openWeek")}
      </Link>
    </section>
  );
}

function presenceCopy(
  presence: ReturnType<typeof fieldPresence>,
  t: ReturnType<typeof useTranslations<"HistoryCompare">>,
) {
  if (presence === "both") return t("presenceBoth");
  if (presence === "left") return t("presenceLeft");
  if (presence === "right") return t("presenceRight");
  return t("presenceNeither");
}

function CompareBridge({
  left,
  right,
  delta,
  ready,
}: {
  left: CompareSide | null;
  right: CompareSide | null;
  delta: number | null;
  ready: boolean;
}) {
  const t = useTranslations("HistoryCompare");
  const tone = compareBridge(delta, ready);
  const chips = [
    { key: "energy" as const, label: t("chipEnergy"), left: left?.energy ?? "", right: right?.energy ?? "" },
    { key: "drain" as const, label: t("chipDrain"), left: left?.drain ?? "", right: right?.drain ?? "" },
    { key: "summary" as const, label: t("chipSummary"), left: left?.summary ?? "", right: right?.summary ?? "" },
  ];

  const feelingLine =
    tone === "waiting"
      ? t("bridgeWaiting")
      : tone === "missing"
        ? t("feelingMissing")
        : tone === "same"
          ? t("feelingSame")
          : tone === "up"
            ? t("feelingUp", { value: delta ?? 0 })
            : t("feelingDown", { value: Math.abs(delta ?? 0) });

  return (
    <section
      data-compare-bridge={tone}
      className="rounded-[1.75rem] bg-cream px-5 py-5 shadow-card sm:px-6"
    >
      <p className="font-display text-lg tracking-tight">{t("bridgeTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("creamNote")}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{feelingLine}</p>
      {ready ? (
      <ul className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const presence = fieldPresence(chip.left, chip.right);
          return (
            <li
              key={chip.key}
              data-compare-presence={`${chip.key}:${presence}`}
              className="rounded-full bg-paper/85 px-3 py-1.5 text-xs text-muted shadow-card"
            >
              <span className="text-foreground">{chip.label}</span>
              <span className="mx-1.5 text-line">·</span>
              {presenceCopy(presence, t)}
            </li>
          );
        })}
      </ul>
      ) : null}
    </section>
  );
}

export function CompareUpgradeTease({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("HistoryCompare");

  return (
    <section className="space-y-5" data-compare-tease="open">
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
        <div data-compare-ghost="cream" className="rounded-[1.75rem] bg-cream px-5 py-6 shadow-card">
          <div className="h-3 w-24 rounded-full bg-blush/80" />
          <div className="mt-4 h-3 w-40 rounded-full bg-paper" />
          <div className="mt-3 h-3 w-full rounded-full bg-paper/80" />
          <div className="mt-2 h-3 w-4/5 rounded-full bg-paper/80" />
        </div>
        <div data-compare-ghost="blush" className="rounded-[1.75rem] bg-blush/80 px-5 py-6 shadow-card">
          <div className="h-3 w-24 rounded-full bg-cream" />
          <div className="mt-4 h-3 w-36 rounded-full bg-paper" />
          <div className="mt-3 h-3 w-full rounded-full bg-paper/80" />
          <div className="mt-2 h-3 w-3/5 rounded-full bg-paper/80" />
        </div>
      </div>
      <div className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <p className="text-sm text-muted">{t("teaseSketch")}</p>
        <h2 className="mt-3 font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
        <p className="mt-3 max-w-md leading-relaxed text-muted">
          {signedIn ? t("lockedBody") : t("signedOutBody")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
          >
            {t("lockedCta")}
          </Link>
          {signedIn ? null : (
            <Link
              href={{ pathname: "/login", query: { next: "/history/compare" } }}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
            >
              {t("loginCta")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function HistoryComparePanel() {
  const t = useTranslations("HistoryCompare");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [reviews, setReviews] = useState<HistoryReview[] | null>(null);
  const [access, setAccess] = useState<ReviewAccessInfo | null>(null);
  const [error, setError] = useState(false);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureLocalReviewsMigrated();
        const next = await fetchReviews();
        if (cancelled) return;
        setReviews(next.reviews);
        setAccess(next.access);
        const open = next.reviews.filter((review) => !review.locked);
        // Reviews are newest-first: put the older week on the left.
        if (open[1]) setLeftId(open[1].id);
        else if (open[0]) setLeftId(open[0].id);
        if (open[0]) setRightId(open[0].id);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const openReviews = useMemo(
    () => (reviews ?? []).filter((review) => !review.locked),
    [reviews],
  );

  const left = useMemo(() => {
    const review = openReviews.find((item) => item.id === leftId);
    return review ? toCompareSide(review) : null;
  }, [openReviews, leftId]);

  const right = useMemo(() => {
    const review = openReviews.find((item) => item.id === rightId);
    return review ? toCompareSide(review) : null;
  }, [openReviews, rightId]);

  const delta = feelingDelta(left?.feeling ?? null, right?.feeling ?? null);
  const ready = canComparePair(leftId || null, rightId || null);

  if (!hydrated || (reviews === null && !error)) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <p className="text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("loadErrorTitle")}</h2>
        <p className="mt-3 max-w-md leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  if (access && !access.softPlus) {
    return <CompareUpgradeTease signedIn={!access.isGuest} />;
  }

  if (openReviews.length < 2) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("needTwoTitle")}</h2>
        <p className="mt-3 max-w-md leading-relaxed text-muted">{t("needTwoBody")}</p>
        <Link
          href="/review"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("needTwoCta")}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-paper px-5 py-5 shadow-card sm:px-6">
        <p className="font-display text-lg tracking-tight">{t("pickTitle")}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("pickLead")}</p>
        <p className="mt-1 text-sm text-muted">{t("creamNote")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">{t("leftLabel")}</span>
            <select
              value={leftId}
              onChange={(event) => setLeftId(event.target.value)}
              className="mt-2 w-full rounded-full border border-line bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
            >
              {openReviews.map((review) => (
                <option key={`l-${review.id}`} value={review.id}>
                  {optionLabel(review, format, tHistory("untitled"))}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("rightLabel")}</span>
            <select
              value={rightId}
              onChange={(event) => setRightId(event.target.value)}
              className="mt-2 w-full rounded-full border border-line bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
            >
              {openReviews.map((review) => (
                <option key={`r-${review.id}`} value={review.id}>
                  {optionLabel(review, format, tHistory("untitled"))}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!ready ? (
          <p className="mt-4 text-sm text-muted">{t("sameWeek")}</p>
        ) : delta != null ? (
          <p className="mt-4 text-sm text-muted">
            {delta === 0
              ? t("feelingSame")
              : delta > 0
                ? t("feelingUp", { value: delta })
                : t("feelingDown", { value: Math.abs(delta) })}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">{t("feelingMissing")}</p>
        )}
      </section>

      <CompareBridge left={left} right={right} delta={delta} ready={ready} />

      <div className="grid gap-5 lg:grid-cols-2">
        <SideCard
          side={ready ? left : null}
          label={t("leftLabel")}
          empty={t("pickHint")}
          place="left"
        />
        <SideCard
          side={ready ? right : null}
          label={t("rightLabel")}
          empty={t("pickHint")}
          place="right"
        />
      </div>
    </div>
  );
}
