import { AdminShell } from "@/components/admin-shell";
import { adminCounts } from "@/db/admin";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const counts = adminCounts();

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/admin/users" label="Users" value={counts.users} wash="bg-peach/80" />
        <StatCard
          href="/admin/reviews"
          label="Reviews"
          value={counts.reviews}
          wash="bg-mint/80"
        />
        <StatCard href="/admin/users" label="Free" value={counts.free} wash="bg-blush/80" />
        <StatCard href="/admin/users" label="Soft+" value={counts.paid} wash="bg-peach/60" />
      </div>
      <p className="mt-8 max-w-lg text-sm leading-relaxed text-muted">
        Public navigation does not link here. Stripe Checkout updates plan via webhook.
        OAuth and email verification are still later.
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
  value: number;
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
