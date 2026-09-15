import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminShell } from "@/components/admin-shell";
import { listAdminUsers } from "@/db/admin";
import { formatAdminWhen, planLabel } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminMembersPage() {
  await requireAdmin();
  const members = listAdminUsers();

  return (
    <AdminShell title="Members" wide>
      {members.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="text-muted">No accounts yet.</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">Email</th>
                <th className="px-5 py-3 font-normal">Plan</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal">Created</th>
                <th className="px-5 py-3 font-normal">Last active</th>
                <th className="px-5 py-3 font-normal">Reviews</th>
                <th className="px-5 py-3 font-normal">Wall</th>
                <th className="px-5 py-3 font-normal">Stripe</th>
                <th className="px-5 py-3 font-normal"> </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 break-all">
                    <Link
                      href={`/admin/members/${encodeURIComponent(member.id)}`}
                      className="text-accent hover:text-foreground"
                    >
                      {member.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {planLabel(member.plan, member.planStatus)}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {member.planStatus ?? "—"}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {formatAdminWhen(member.createdAt)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {formatAdminWhen(member.lastActive ?? member.createdAt)}
                  </td>
                  <td className="px-5 py-3">{member.reviewCount}</td>
                  <td className="px-5 py-3">{member.wallNoteCount}</td>
                  <td className="px-5 py-3 text-xs leading-relaxed text-muted">
                    <div className="max-w-[14rem] break-all">
                      {member.stripeCustomerId ?? "no customer"}
                    </div>
                    <div className="mt-1 max-w-[14rem] break-all">
                      {member.stripeSubscriptionId ?? "no subscription"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <AdminDeleteButton
                      endpoint={`/api/admin/users/${encodeURIComponent(member.id)}`}
                      confirmText={`Delete ${member.email} and their reviews?`}
                      label="Delete"
                      redirectTo="/admin/members"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
