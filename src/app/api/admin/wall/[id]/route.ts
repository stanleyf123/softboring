import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getWallNoteIncludingHidden, setWallNoteHidden } from "@/db/wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const current = getWallNoteIncludingHidden(id);
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let hidden = true;
  try {
    const body = (await request.json()) as { hidden?: unknown };
    if (typeof body.hidden === "boolean") hidden = body.hidden;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  setWallNoteHidden(id, hidden);
  return NextResponse.json({ ok: true, hidden });
}
