import { NextResponse } from "next/server";
import { ensureUserSettings, updateUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCustomQuestions } from "@/lib/custom-questions";
import { isSoftPlusPlan } from "@/lib/plan";
import { requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const softPlus = Boolean(user && isSoftPlusPlan(user.plan, user.planStatus));
  const locked = requireSoftPlus(user, softPlus);
  if (locked) return locked;

  const settings = ensureUserSettings(user!.id);
  return NextResponse.json({ questions: settings.customQuestions });
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    const softPlus = Boolean(user && isSoftPlusPlan(user.plan, user.planStatus));
    const locked = requireSoftPlus(user, softPlus);
    if (locked) return locked;

    const body = (await request.json()) as { questions?: unknown };
    const questions = normalizeCustomQuestions(body.questions);
    const settings = updateUserSettings(user!.id, { customQuestions: questions });
    return NextResponse.json({ questions: settings.customQuestions });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("PUT /api/account/custom-questions failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
