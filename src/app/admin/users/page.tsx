import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminUsersRedirectPage() {
  await requireAdmin();
  redirect("/admin/members");
}
