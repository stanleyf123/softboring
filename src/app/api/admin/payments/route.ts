import { NextResponse } from "next/server";
import { isPaymentKind, isPaymentStatus, listPayments } from "@/db/payments";
import { isAdminRequest } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const email = url.searchParams.get("email") ?? "";
  return NextResponse.json({
    payments: listPayments({
      kind: isPaymentKind(kind) ? kind : undefined,
      status: isPaymentStatus(status) ? status : undefined,
      email: email.trim() || undefined,
    }),
  });
}
