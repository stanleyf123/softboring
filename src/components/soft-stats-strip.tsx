import { publicSoftStats } from "@/db/soft-stats";

type Props = {
  wallNotesThisWeek: number;
  publicWallNotes: number;
  languages: number;
  labels: {
    aria: string;
    wallWeek: string;
    wallPublic: string;
    languages: string;
    note: string;
  };
};

export function SoftStatsStrip({
  wallNotesThisWeek,
  publicWallNotes,
  languages,
  labels,
}: Props) {
  return (
    <section
      className="mt-12 rounded-[1.75rem] bg-mint/35 px-6 py-6 sm:px-8"
      aria-label={labels.aria}
    >
      <p className="text-sm leading-relaxed text-muted">{labels.note}</p>
      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dt className="text-xs tracking-wide text-muted">{labels.wallWeek}</dt>
          <dd className="mt-1 font-display text-3xl tracking-tight tabular-nums">
            {wallNotesThisWeek}
          </dd>
        </div>
        <div data-public-wall-count={publicWallNotes}>
          <dt className="text-xs tracking-wide text-muted">{labels.wallPublic}</dt>
          <dd className="mt-1 font-display text-3xl tracking-tight tabular-nums">
            {publicWallNotes}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted">{labels.languages}</dt>
          <dd className="mt-1 font-display text-3xl tracking-tight tabular-nums">
            {languages}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export async function HomeSoftStats({
  labels,
}: {
  labels: Props["labels"];
}) {
  const stats = publicSoftStats();
  return (
    <SoftStatsStrip
      wallNotesThisWeek={stats.wallNotesThisWeek}
      publicWallNotes={stats.publicWallNotes}
      languages={stats.languages}
      labels={labels}
    />
  );
}
