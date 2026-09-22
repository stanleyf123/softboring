import type { ReactNode } from "react";

type DoodleProps = {
  className?: string;
};

export function SoftMark({ className = "h-9 w-9" }: DoodleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="12" fill="#f4d4c6" />
      <path
        d="M18 26c0-7.2 3.4-12.2 8.4-14.6"
        stroke="#7d9b8c"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 22.5c-1.8-3.4-4.8-5.2-8-5.6"
        stroke="#c47f6e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="26.5" r="1.6" fill="#4a3c35" />
      <path
        d="M22.2 10.2c1.8-.2 3.4 1.2 3.5 3-1.8.3-3.4-1.1-3.5-3Z"
        fill="#7d9b8c"
      />
      <path
        d="M11.4 14.4c-1.7.4-2.6 2.2-2 3.8 1.6-.5 2.6-2.3 2-3.8Z"
        fill="#c47f6e"
      />
    </svg>
  );
}

export function HeroDoodle({ className = "h-auto w-full" }: DoodleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 240"
      fill="none"
      aria-hidden="true"
    >
      <rect x="12" y="14" width="256" height="212" rx="36" fill="#f8dcc8" />
      <rect x="28" y="30" width="224" height="132" rx="28" fill="#fff8f2" />
      <circle cx="196" cy="64" r="22" fill="#f4d4c6" />
      <circle cx="196" cy="64" r="14" fill="#f8dcc8" />
      <path
        d="M28 118c22-18 48-18 70 0s52 18 76 0 50-18 78 2v42H28v-44Z"
        fill="#d5e6d8"
      />
      <rect x="58" y="146" width="96" height="64" rx="10" fill="#fff8f2" />
      <rect x="62" y="150" width="42" height="56" rx="6" fill="#f4d4c6" />
      <rect x="108" y="150" width="42" height="56" rx="6" fill="#d5e6d8" />
      <path
        d="M72 162h22M72 172h18M72 182h20"
        stroke="#c47f6e"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M118 162h22M118 172h16M118 182h20"
        stroke="#7d9b8c"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="186" cy="196" rx="22" ry="8" fill="#ead6c8" />
      <path
        d="M170 186c0-12 8-18 16-18s16 6 16 18"
        stroke="#c47f6e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="186" cy="186" rx="16" ry="5" fill="#fff8f2" />
      <path
        d="M186 168c0-8 6-12 10-10"
        stroke="#7d9b8c"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="72" cy="52" r="5" fill="#d5e6d8" />
      <circle cx="92" cy="44" r="3.5" fill="#f4d4c6" />
    </svg>
  );
}

function IconFrame({
  fill,
  children,
}: {
  fill: string;
  children: ReactNode;
}) {
  return (
    <svg
      className="h-10 w-10 shrink-0"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="14" fill={fill} />
      {children}
    </svg>
  );
}

export function EnergyIcon() {
  return (
    <IconFrame fill="#f8dcc8">
      <circle cx="20" cy="20" r="6.5" fill="#c47f6e" />
      <path
        d="M20 9v3.2M20 27.8V31M9 20h3.2M27.8 20H31M12.2 12.2l2.3 2.3M25.5 25.5l2.3 2.3M12.2 27.8l2.3-2.3M25.5 14.5l2.3-2.3"
        stroke="#c47f6e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function DrainIcon() {
  return (
    <IconFrame fill="#f4d4c6">
      <path
        d="M20 9.5c0 0-7.4 9.2-7.4 14.1a7.4 7.4 0 1 0 14.8 0C27.4 18.7 20 9.5 20 9.5Z"
        fill="#c47f6e"
      />
      <path
        d="M17.2 22.2c.2-1.5 1.3-2.8 2.5-3.8"
        stroke="#fff8f2"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function LessOfIcon() {
  return (
    <IconFrame fill="#d5e6d8">
      <path
        d="M20 28c0-8 4.4-13 10-16"
        stroke="#7d9b8c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 24c-2.4-4-6.2-6-10.5-6.2"
        stroke="#c47f6e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M25.4 10.4c2.2-.3 4.2 1.4 4.4 3.6-2.3.4-4.2-1.3-4.4-3.6Z"
        fill="#7d9b8c"
      />
      <path
        d="M11.6 15.6c-2.1.5-3.2 2.7-2.4 4.6 2-.6 3.2-2.8 2.4-4.6Z"
        fill="#c47f6e"
      />
    </IconFrame>
  );
}

export function PrioritiesIcon() {
  return (
    <IconFrame fill="#f8dcc8">
      <circle cx="14" cy="23" r="4.2" fill="#c47f6e" />
      <circle cx="26" cy="23" r="4.2" fill="#7d9b8c" />
      <circle cx="20" cy="14" r="4.2" fill="#f4d4c6" stroke="#c47f6e" strokeWidth="1.2" />
    </IconFrame>
  );
}

export function FeelingIcon() {
  return (
    <IconFrame fill="#f4d4c6">
      <path
        d="M20 28c-6.4-4-10-8.2-10-12.2C10 12.4 12.6 10 16 10c2 0 3.4.9 4 2.2C20.6 10.9 22 10 24 10c3.4 0 6 2.4 6 5.8 0 4-3.6 8.2-10 12.2Z"
        fill="#c47f6e"
      />
    </IconFrame>
  );
}

export function SummaryIcon() {
  return (
    <IconFrame fill="#d5e6d8">
      <rect x="11" y="10" width="18" height="20" rx="4" fill="#fff8f2" />
      <path
        d="M15 16h10M15 21h8M15 26h6"
        stroke="#7d9b8c"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

export function TeacupDoodle({ className = "h-auto w-full" }: DoodleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="78" cy="122" rx="42" ry="8" fill="#ead6c8" />
      <path
        d="M38 58c0-18 18-28 40-28s40 10 40 28v28c0 14-16 24-40 24s-40-10-40-24V58Z"
        fill="#fff8f2"
      />
      <path
        d="M38 72c8 8 24 12 40 12s32-4 40-12"
        stroke="#ead6c8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M118 68c12 2 20 12 16 22-4 10-16 14-26 10"
        stroke="#c47f6e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M64 36c0-10 6-16 10-16 2 8-2 14-10 16Z"
        fill="#d5e6d8"
      />
      <path
        d="M84 32c0-12 7-18 12-18 2 10-3 16-12 18Z"
        fill="#f4d4c6"
      />
      <circle cx="58" cy="84" r="3" fill="#f4d4c6" />
      <circle cx="96" cy="90" r="2.4" fill="#d5e6d8" />
    </svg>
  );
}

export function EnvelopeDoodle({ className = "h-auto w-full" }: DoodleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
    >
      <rect x="18" y="28" width="124" height="72" rx="16" fill="#fff8f2" />
      <path d="M18 44l62 34 62-34" stroke="#c47f6e" strokeWidth="2.4" />
      <path d="M18 92l46-30" stroke="#ead6c8" strokeWidth="2" />
      <path d="M142 92l-46-30" stroke="#ead6c8" strokeWidth="2" />
      <circle cx="128" cy="28" r="14" fill="#d5e6d8" />
      <circle cx="128" cy="28" r="7" fill="#f8dcc8" />
    </svg>
  );
}

export function StampFlower({ className = "h-10 w-10" }: DoodleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="12" r="6" fill="#c47f6e" />
      <circle cx="12" cy="20" r="6" fill="#7d9b8c" />
      <circle cx="28" cy="20" r="6" fill="#f8dcc8" />
      <circle cx="20" cy="28" r="6" fill="#d5e6d8" />
      <circle cx="20" cy="20" r="4.2" fill="#fff8f2" />
      <circle cx="20" cy="20" r="2.4" fill="#c47f6e" />
    </svg>
  );
}

/** Soft empty-state shapes — lightweight SVG, no heavy assets. */
export function HistoryEmptyDoodle({ className = "h-24 w-24" }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="14" y="18" width="52" height="64" rx="14" fill="#f8dcc8" />
      <rect x="22" y="26" width="52" height="64" rx="14" fill="#fff8f2" />
      <path
        d="M34 44h28M34 54h22M34 64h18"
        stroke="#c47f6e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="68" cy="28" r="10" fill="#d5e6d8" />
      <circle cx="68" cy="28" r="5" fill="#f4d4c6" />
    </svg>
  );
}

export function DigestEmptyDoodle({ className = "h-24 w-24" }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <ellipse cx="48" cy="72" rx="28" ry="8" fill="#ead6c8" />
      <rect x="22" y="28" width="52" height="40" rx="16" fill="#fff8f2" />
      <path d="M22 40l26 16 26-16" stroke="#c47f6e" strokeWidth="2.2" />
      <circle cx="36" cy="52" r="4" fill="#d5e6d8" />
      <circle cx="52" cy="56" r="3.2" fill="#f4d4c6" />
      <path
        d="M48 18c0-8 6-12 10-10"
        stroke="#7d9b8c"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function YearEmptyDoodle({ className = "h-24 w-24" }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="16" y="20" width="64" height="56" rx="18" fill="#f4d4c6" />
      <rect x="24" y="28" width="48" height="40" rx="12" fill="#fff8f2" />
      {[0, 1, 2, 3]
        .flatMap((col) =>
          [0, 1, 2].map((row) => (
            <circle
              key={`${col}-${row}`}
              cx={34 + col * 10}
              cy={40 + row * 10}
              r="3.2"
              fill={row === 1 && col === 2 ? "#c47f6e" : "#d5e6d8"}
              opacity={row === 2 && col === 0 ? 0.45 : 1}
            />
          )),
        )}
    </svg>
  );
}

export function SavedEmptyDoodle({ className = "h-24 w-24" }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="18" y="22" width="48" height="54" rx="14" fill="#f8dcc8" transform="rotate(-6 42 49)" />
      <rect x="28" y="20" width="48" height="54" rx="14" fill="#fff8f2" />
      <path
        d="M52 38c-6.4-4-10-8-10-11.8C42 23 44.6 21 47.6 21c1.8 0 3 .8 3.6 2 0.6-1.2 1.8-2 3.6-2C57.8 21 60.4 23 60.4 26.2 60.4 30 56.8 34 52 38Z"
        fill="#c47f6e"
      />
      <circle cx="40" cy="54" r="2.4" fill="#d5e6d8" />
      <circle cx="56" cy="58" r="2" fill="#f4d4c6" />
    </svg>
  );
}

export function SoftShapesEmpty({
  kind = "default",
  className = "h-24 w-24",
}: DoodleProps & {
  kind?: "default" | "history" | "digest" | "year" | "saved";
}) {
  switch (kind) {
    case "history":
      return <HistoryEmptyDoodle className={className} />;
    case "digest":
      return <DigestEmptyDoodle className={className} />;
    case "year":
      return <YearEmptyDoodle className={className} />;
    case "saved":
      return <SavedEmptyDoodle className={className} />;
    default:
      return <TeacupDoodle className={className} />;
  }
}
