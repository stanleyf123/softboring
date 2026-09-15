import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listAdminWallNotes } from "@/db/wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ notes: listAdminWallNotes() });
}
