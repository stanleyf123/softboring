import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminShell } from "@/components/admin-shell";
import { listAdminUsers } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";
import { formatAdminWhen, planLabel } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

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
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">{copy.email}</th>
                <th className="px-5 py-3 font-normal">{copy.plan}</th>
                <th className="px-5 py-3 font-normal">{copy.status}</th>
                <th className="px-5 py-3 font-normal">{copy.created}</th>
                <th className="px-5 py-3 font-normal">{copy.lastActive}</th>
                <th className="px-5 py-3 font-normal">{copy.reviews}</th>
                <th className="px-5 py-3 font-normal">{copy.wall}</th>
                <th className="px-5 py-3 font-normal">{copy.stripe}</th>
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
                    {member.planStatus ?? adminCopy.common.dash}
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
                      {member.stripeCustomerId ?? copy.noCustomer}
                    </div>
                    <div className="mt-1 max-w-[14rem] break-all">
                      {member.stripeSubscriptionId ?? copy.noSubscription}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <AdminDeleteButton
                      endpoint={`/api/admin/users/${encodeURIComponent(member.id)}`}
                      confirmText={copy.deleteConfirm(member.email)}
                      label={copy.delete}
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
