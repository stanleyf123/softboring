"use client";

import { adminCopy } from "@/lib/admin-copy";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminPlanButtons({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setPlan(plan: "soft_plus" | "free", clearStripeIds = false) {
    const confirmText =
      plan === "soft_plus"
        ? adminCopy.member.grantConfirm(email)
        : clearStripeIds
          ? adminCopy.member.freeClearConfirm(email)
          : adminCopy.member.freeConfirm(email);
    if (!window.confirm(confirmText)) return;
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, clearStripeIds }),
        },
      );
      if (!response.ok) {
        window.alert(adminCopy.member.updateError);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => setPlan("soft_plus")}
        className="rounded-full border border-line px-4 py-2 text-sm hover:bg-mint/70 disabled:opacity-60"
      >
        {adminCopy.member.grantPlus}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setPlan("free")}
        className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:bg-blush/70 hover:text-foreground disabled:opacity-60"
      >
        {adminCopy.member.setFree}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setPlan("free", true)}
        className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:bg-blush/70 hover:text-foreground disabled:opacity-60"
      >
        {adminCopy.member.setFreeClear}
      </button>
    </div>
  );
}
