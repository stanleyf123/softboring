import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminShell } from "@/components/admin-shell";
import { listAdminUsers } from "@/db/admin";
import { requireAdmin } from "@/lib/admin";
import { displayPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = listAdminUsers();

  return (
    <AdminShell title="Users">
      {users.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="text-muted">No accounts yet.</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">Email</th>
                <th className="px-5 py-3 font-normal">Plan</th>
                <th className="px-5 py-3 font-normal">Created</th>
                <th className="px-5 py-3 font-normal">Reviews</th>
                <th className="px-5 py-3 font-normal"> </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 break-all">{user.email}</td>
                  <td className="px-5 py-3">
                    {displayPlan(user.plan, user.planStatus) === "soft_plus"
                      ? "Soft+"
                      : "Free"}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(user.createdAt).toLocaleString("en")}
                  </td>
                  <td className="px-5 py-3">{user.reviewCount}</td>
                  <td className="px-5 py-3 text-right">
                    <AdminDeleteButton
                      endpoint={`/api/admin/users/${encodeURIComponent(user.id)}`}
                      confirmText={`Delete ${user.email} and their reviews?`}
                      label="Delete"
                      redirectTo="/admin/users"
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
