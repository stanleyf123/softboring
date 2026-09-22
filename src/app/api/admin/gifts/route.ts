import { NextResponse } from "next/server";
import { countGiftCodes, countUnusedGiftCodes, listGiftCodes, mintGiftCode } from "@/db/gift-codes";
import { isAdminRequest } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    codes: listGiftCodes(200),
    total: countGiftCodes(),
    unused: countUnusedGiftCodes(),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { permanent?: unknown; days?: unknown; note?: unknown } = {};
  try {
    body = (await request.json()) as { permanent?: unknown; days?: unknown; note?: unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const permanent = body.permanent === true;
  const daysRaw = body.days;
  const days =
    typeof daysRaw === "number"
      ? daysRaw
      : typeof daysRaw === "string" && daysRaw.trim()
        ? Number(daysRaw)
        : null;
  const note = typeof body.note === "string" ? body.note : null;

  try {
    const code = mintGiftCode({
      permanent,
      days: permanent ? null : days,
      note,
    });
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "invalid_days") {
      return NextResponse.json(
        { error: "Days must be an integer from 1 to 3650, or mark permanent." },
        { status: 400 },
      );
    }
    throw error;
  }
}
