import { NextResponse } from "next/server";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
} from "@/db/notifications";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    notifications: listNotificationsForUser(user.id),
  });
}

export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  markAllNotificationsRead(user.id);
  return NextResponse.json({
    notifications: listNotificationsForUser(user.id),
  });
}
