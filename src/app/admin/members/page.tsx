import { AdminMembersTable } from "@/components/admin-members-table";
import { AdminShell } from "@/components/admin-shell";
import { listAdminUsers } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminMembersPage() {
  await requireAdmin();
  const members = listAdminUsers();
  const copy = adminCopy.members;

  return (
    <AdminShell title={copy.title} wide>
      {members.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="font-display text-xl tracking-tight">{copy.empty}</p>
          <p className="mt-2 text-sm text-muted">註冊後的帳號會出現在這裡。</p>
        </section>
      ) : (
        <AdminMembersTable members={members} />
      )}
    </AdminShell>
  );
}
