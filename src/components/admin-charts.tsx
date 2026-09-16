import type { AdminSignupWeek } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";

export function AdminSignupChart({ weeks }: { weeks: AdminSignupWeek[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const width = 320;
  const height = 148;
  const left = 28;
  const bottom = 28;
  const chartH = 100;
  const gap = 8;
  const barW = (width - left - 12 - gap * (weeks.length - 1)) / weeks.length;

  return (
    <figure className="rounded-[1.75rem] bg-paper px-5 py-5 shadow-card sm:px-6">
      <figcaption className="font-display text-xl tracking-tight">
        {adminCopy.dashboard.signupsTitle}
      </figcaption>
      <p className="mt-1 text-sm text-muted">{adminCopy.dashboard.signupsLead}</p>
      <svg
        className="mt-4 w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={adminCopy.dashboard.signupsLabel}
      >
        {weeks.map((week, index) => {
          const barH = (week.count / max) * chartH;
          const x = left + index * (barW + gap);
          const y = bottom + (chartH - barH);
          return (
            <g key={week.week}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, week.count > 0 ? 4 : 0)}
                rx={8}
                fill="#f8dcc8"
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#4a3c35"
              >
                {week.count}
              </text>
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#9a7f74"
              >
                {week.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function AdminPlanMixChart({ plus, free }: { plus: number; free: number }) {
  const total = plus + free;
  const plusPct = total === 0 ? 0 : Math.round((plus / total) * 100);
  const freePct = total === 0 ? 0 : 100 - plusPct;

  return (
    <figure className="rounded-[1.75rem] bg-paper px-5 py-5 shadow-card sm:px-6">
      <figcaption className="font-display text-xl tracking-tight">
        {adminCopy.dashboard.mixTitle}
      </figcaption>
      <p className="mt-1 text-sm text-muted">{adminCopy.dashboard.mixLead}</p>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full"
          style={{
            background:
              total === 0
                ? "conic-gradient(#ead6c8 0 100%)"
                : `conic-gradient(#f8dcc8 0 ${plusPct}%, #d5e6d8 ${plusPct}% 100%)`,
          }}
          role="img"
          aria-label={adminCopy.dashboard.mixLabel(plus, free)}
        >
          <div className="absolute inset-5 rounded-full bg-paper" />
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-peach" aria-hidden="true" />
            {adminCopy.dashboard.softPlus} · {plus}
            {total ? `（${plusPct}%）` : ""}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-mint" aria-hidden="true" />
            {adminCopy.dashboard.free} · {free}
            {total ? `（${freePct}%）` : ""}
          </li>
        </ul>
      </div>
    </figure>
  );
}
