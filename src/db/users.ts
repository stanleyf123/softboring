import { getDb } from "./client";
import {
  displayPlan,
  PLAN_FREE,
  type PlanId,
} from "@/lib/plan";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  created_at: string;
  plan: string;
  plan_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_updated_at: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
  plan: PlanId;
  planStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type PublicUserRow = Pick<
  UserRow,
  | "id"
  | "email"
  | "created_at"
  | "plan"
  | "plan_status"
  | "stripe_customer_id"
  | "stripe_subscription_id"
>;

export function toPublicUser(row: PublicUserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    plan: displayPlan(row.plan, row.plan_status),
    planStatus: row.plan_status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

const PUBLIC_USER_COLUMNS = `id, email, created_at, plan, plan_status, stripe_customer_id, stripe_subscription_id`;

export function createUser(email: string, passwordHash: string): PublicUser {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, created_at, plan)
         VALUES (@id, @email, @password_hash, @created_at, @plan)`,
      )
      .run({
        id,
        email,
        password_hash: passwordHash,
        created_at: createdAt,
        plan: PLAN_FREE,
      });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT") {
      const taken = new Error("email_taken");
      taken.name = "EmailTakenError";
      throw taken;
    }
    throw error;
  }
  ensureSettingsForNewUser(id);
  return {
    id,
    email,
    createdAt,
    plan: PLAN_FREE,
    planStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

export function ensureSettingsForNewUser(userId: string) {
  try {
    getDb()
      .prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`)
      .run(userId);
  } catch {
    // Migration may not have created the table yet in very old tests; ignore.
  }
}

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`)
    .get(email) as UserRow | undefined;
}

export function getUserById(id: string): PublicUser | undefined {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`)
    .get(id) as PublicUserRow | undefined;
  return row ? toPublicUser(row) : undefined;
}

export function getUserByStripeCustomerId(customerId: string): PublicUser | undefined {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE stripe_customer_id = ?`)
    .get(customerId) as PublicUserRow | undefined;
  return row ? toPublicUser(row) : undefined;
}

export function getUserByStripeSubscriptionId(
  subscriptionId: string,
): PublicUser | undefined {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE stripe_subscription_id = ?`)
    .get(subscriptionId) as PublicUserRow | undefined;
  return row ? toPublicUser(row) : undefined;
}

export type BillingPatch = {
  plan?: PlanId;
  planStatus?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
};

export function updateUserBilling(userId: string, patch: BillingPatch) {
  const current = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(userId) as UserRow | undefined;
  if (!current) return 0;

  return getDb()
    .prepare(
      `UPDATE users
       SET plan = @plan,
           plan_status = @plan_status,
           stripe_customer_id = @stripe_customer_id,
           stripe_subscription_id = @stripe_subscription_id,
           stripe_price_id = @stripe_price_id,
           plan_updated_at = @plan_updated_at
       WHERE id = @id`,
    )
    .run({
      id: userId,
      plan: patch.plan ?? current.plan,
      plan_status: patch.planStatus === undefined ? current.plan_status : patch.planStatus,
      stripe_customer_id:
        patch.stripeCustomerId === undefined
          ? current.stripe_customer_id
          : patch.stripeCustomerId,
      stripe_subscription_id:
        patch.stripeSubscriptionId === undefined
          ? current.stripe_subscription_id
          : patch.stripeSubscriptionId,
      stripe_price_id:
        patch.stripePriceId === undefined ? current.stripe_price_id : patch.stripePriceId,
      plan_updated_at: new Date().toISOString(),
    }).changes;
}

export function deleteUser(id: string) {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare(`DELETE FROM oauth_accounts WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM reviews WHERE user_id = ?`).run(id);
    return db.prepare(`DELETE FROM users WHERE id = ?`).run(id).changes;
  });
  return run();
}
