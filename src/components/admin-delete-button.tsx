"use client";

import { useRouter } from "next/navigation";

export function AdminDeleteButton({
  endpoint,
  confirmText,
  label,
  redirectTo,
}: {
  endpoint: string;
  confirmText: string;
  label: string;
  redirectTo: string;
}) {
  const router = useRouter();

  async function onClick() {
    if (!window.confirm(confirmText)) return;
    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      window.alert("Could not delete.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:bg-blush/70 hover:text-foreground"
    >
      {label}
    </button>
  );
}
