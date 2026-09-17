import { NextResponse } from "next/server";
import { getUserById, updateUserNickname } from "@/db/users";
import { getCurrentUser } from "@/lib/auth";
import { NicknameError, parseNickname } from "@/lib/nickname";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { nickname?: unknown };
    const nickname = parseNickname(body.nickname);
    const changes = updateUserNickname(user.id, nickname);
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const next = getUserById(user.id);
    return NextResponse.json({ nickname: next?.nickname ?? nickname });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    if (error instanceof NicknameError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    console.error("PATCH /api/account/nickname failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
