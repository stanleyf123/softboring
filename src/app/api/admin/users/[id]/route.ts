import { NextResponse } from "next/server";
import { getAdminMember } from "@/db/admin";
import { deleteUser, updateUserBilling } from "@/db/users";
import { isAdminRequest } from "@/lib/admin";
import { asPlanId } from "@/lib/admin-format";
import { PLAN_FREE, PLAN_SOFT_PLUS } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const member = getAdminMember(id);
  if (!member) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ user: member });
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const member = getAdminMember(id);
  if (!member) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let body: { plan?: unknown; clearStripeIds?: unknown } = {};
  try {
    body = (await request.json()) as { plan?: unknown; clearStripeIds?: unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const plan = asPlanId(body.plan);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  const clearStripeIds = body.clearStripeIds === true;
  if (clearStripeIds && plan !== PLAN_FREE) {
    return NextResponse.json(
      { error: "Stripe ids can only be cleared when setting Free." },
      { status: 400 },
    );
  }

  if (plan === PLAN_SOFT_PLUS) {
    updateUserBilling(id, {
      plan: PLAN_SOFT_PLUS,
      planStatus: "active",
    });
  } else {
    updateUserBilling(id, {
      plan: PLAN_FREE,
      planStatus: "canceled",
      ...(clearStripeIds
        ? {
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            stripePriceId: null,
          }
        : {}),
    });
  }

  return NextResponse.json({ user: getAdminMember(id) });
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const changes = deleteUser(id);
  if (!changes) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
