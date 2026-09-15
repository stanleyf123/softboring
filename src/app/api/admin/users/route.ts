import { NextResponse } from "next/server";
import { getAdminMember, listAdminUsers } from "@/db/admin";
import { isAdminRequest } from "@/lib/admin";
import { asPlanId } from "@/lib/admin-format";
import { applyAdminPlanChange } from "@/lib/admin-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BULK = 50;

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ users: listAdminUsers() });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { ids?: unknown; plan?: unknown } = {};
  try {
    body = (await request.json()) as { ids?: unknown; plan?: unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const plan = asPlanId(body.plan);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "Select at least one member." }, { status: 400 });
  }
  if (body.ids.length > MAX_BULK) {
    return NextResponse.json({ error: "Too many members." }, { status: 400 });
  }

  const ids = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  const users = [];
  for (const id of ids) {
    const member = getAdminMember(id);
    if (!member) continue;
    applyAdminPlanChange(id, plan);
    const next = getAdminMember(id);
    if (next) users.push(next);
  }

  return NextResponse.json({ users });
}
