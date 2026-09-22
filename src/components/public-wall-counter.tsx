import { Link } from "@/i18n/navigation";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";

export function PublicWallCounter({
  count,
  label,
  ariaLabel,
}: {
  count: number;
  label: string;
  ariaLabel: string;
}) {
  return (
    <p className="mt-5" data-public-wall-count={count}>
      <Link
        href="/wall"
        aria-label={ariaLabel}
        className={`${SOFT_CHROME_FOCUS} inline-flex min-h-11 items-center gap-2 rounded-full bg-mint/70 px-4 py-2 text-sm shadow-card hover:text-foreground`}
      >
        <span className="font-display text-lg tabular-nums tracking-tight" aria-hidden="true">
          {count}
        </span>
        <span>{label}</span>
      </Link>
    </p>
  );
}
