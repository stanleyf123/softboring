import { NextResponse } from "next/server";
import { countReviewsForUser } from "@/db/reviews";
import { countUnreadNotifications } from "@/db/notifications";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { isSoftPlusPlan } from "@/lib/plan";
import { isStripeConfigured } from "@/lib/stripe";
import { isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        user: null,
        stripeConfigured: isStripeConfigured(),
        emailConfigured: isEmailConfigured(),
      });
    }
    const settings = ensureUserSettings(user.id);
    return NextResponse.json({
      user: {
        email: user.email,
        createdAt: user.createdAt,
        plan: user.plan,
        planStatus: user.planStatus,
        softPlus: isSoftPlusPlan(user.plan, user.planStatus),
        reviewCount: countReviewsForUser(user.id),
        hasStripeCustomer: Boolean(user.stripeCustomerId),
        settings,
        unreadNotifications: countUnreadNotifications(user.id),
      },
      stripeConfigured: isStripeConfigured(),
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
