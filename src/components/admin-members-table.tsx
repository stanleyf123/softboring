"use client";

import { AdminDeleteButton } from "@/components/admin-delete-button";
import { adminCopy } from "@/lib/admin-copy";
import { formatAdminWhen, planLabel } from "@/lib/admin-format";
import { PLAN_FREE, PLAN_SOFT_PLUS, type PlanId } from "@/lib/plan";
import type { AdminUserListItem } from "@/db/admin";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AdminMembersTable({ members }: { members: AdminUserListItem[] }) {
  const router = useRouter();
  const copy = adminCopy.members;
  const [rows, setRows] = useState(members);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setRows(members);
  }, [members]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  );

  async function setPlan(userId: string, email: string, plan: PlanId) {
    const confirmText =
      plan === PLAN_SOFT_PLUS
        ? adminCopy.member.grantConfirm(email)
        : adminCopy.member.freeConfirm(email);
    if (!window.confirm(confirmText)) return;
    if (busyId) return;
    setBusyId(userId);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!response.ok) {
        window.alert(adminCopy.member.updateError);
        return;
      }
      const data = (await response.json()) as { user?: AdminUserListItem };
      if (data.user) {
        setRows((current) =>
          current.map((row) => (row.id === data.user!.id ? { ...row, ...data.user } : row)),
        );
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function grantSelected() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(adminCopy.member.bulkConfirm(selectedIds.length))) return;
    if (busyId) return;
    setBusyId("bulk");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, plan: PLAN_SOFT_PLUS }),
      });
      if (!response.ok) {
        window.alert(adminCopy.member.updateError);
        return;
      }
      const data = (await response.json()) as { users?: AdminUserListItem[] };
      const nextById = new Map((data.users ?? []).map((user) => [user.id, user]));
      setRows((current) =>
        current.map((row) => (nextById.has(row.id) ? { ...row, ...nextById.get(row.id) } : row)),
      );
      setSelected({});
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-mint/60 px-5 py-4 shadow-card">
        <p className="max-w-xl text-sm leading-relaxed">{adminCopy.member.listHint}</p>
        <button
          type="button"
          disabled={busyId !== null || selectedIds.length === 0}
          onClick={grantSelected}
          className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-50"
        >
          {adminCopy.member.bulkPlus}
          {selectedIds.length ? ` (${selectedIds.length})` : ""}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
        <table className="w-full min-w-[76rem] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-normal">{copy.select}</th>
              <th className="px-5 py-3 font-normal">{copy.email}</th>
              <th className="px-5 py-3 font-normal">{copy.plan}</th>
              <th className="px-5 py-3 font-normal">{copy.actions}</th>
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
            {rows.map((member) => {
              const plus = member.displayPlan === PLAN_SOFT_PLUS;
              return (
                <tr key={member.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={member.email}
                      checked={Boolean(selected[member.id])}
                      onChange={(event) =>
                        setSelected((current) => ({
                          ...current,
                          [member.id]: event.target.checked,
                        }))
                      }
                    />
                  </td>
                  <td className="px-5 py-3 break-all">
                    <Link
                      href={`/admin/members/${encodeURIComponent(member.id)}`}
                      className="text-accent hover:text-foreground"
                    >
                      {member.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        plus
                          ? "inline-flex rounded-full bg-mint px-3 py-1 text-sm font-medium"
                          : "inline-flex rounded-full bg-peach px-3 py-1 text-sm"
                      }
                    >
                      {planLabel(member.plan, member.planStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {plus ? (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => setPlan(member.id, member.email, PLAN_FREE)}
                          className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:bg-blush/70 hover:text-foreground disabled:opacity-60"
                        >
                          {adminCopy.member.setRowFree}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => setPlan(member.id, member.email, PLAN_SOFT_PLUS)}
                          className="rounded-full bg-mint px-3 py-1.5 text-sm shadow-card hover:bg-mint disabled:opacity-60"
                        >
                          {adminCopy.member.setRowPlus}
                        </button>
                      )}
                    </div>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
