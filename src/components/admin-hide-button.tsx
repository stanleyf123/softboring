"use client";

import { adminCopy } from "@/lib/admin-copy";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminHideButton({
  endpoint,
  hidden,
}: {
  endpoint: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden }),
      });
      if (!response.ok) {
        window.alert(adminCopy.wall.updateError);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:bg-blush/70 hover:text-foreground disabled:opacity-60"
    >
      {hidden ? adminCopy.wall.unhide : adminCopy.wall.hide}
    </button>
  );
}
