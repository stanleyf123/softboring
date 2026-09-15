import { AdminShell } from "@/components/admin-shell";
import { adminCounts } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";
import { formatRevenueSummary } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const counts = adminCounts();
  const revenue = formatRevenueSummary(counts.payments.byCurrency);
  const copy = adminCopy.dashboard;

  return (
    <AdminShell title={copy.title}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/admin/members" label={copy.members} value={counts.users} wash="bg-peach/80" />
        <StatCard href="/admin/members" label={copy.softPlus} value={counts.paid} wash="bg-peach/60" />
        <StatCard href="/admin/members" label={copy.free} value={counts.free} wash="bg-blush/80" />
        <StatCard href="/admin/reviews" label={copy.reviews} value={counts.reviews} wash="bg-mint/80" />
        <StatCard href="/admin/wall" label={copy.wallNotes} value={counts.wallNotes} wash="bg-mint/60" />
        <StatCard
          href="/admin/payments"
          label={copy.succeededPayments}
          value={counts.payments.succeededCount}
          wash="bg-sky/80"
        />
        <StatCard
          href="/admin/payments"
          label={copy.revenue}
          value={revenue}
          wash="bg-lemon/80"
        />
      </div>
      <p className="mt-8 max-w-lg text-sm leading-relaxed text-muted">
        {copy.note}
      </p>
    </AdminShell>
  );
}

function StatCard({
  href,
  label,
  value,
  wash,
}: {
  href: string;
  label: string;
  value: number | string;
  wash: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[1.75rem] ${wash} px-6 py-6 shadow-card`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl tracking-tight">{value}</p>
    </Link>
  );
}
