import { getDb } from "./client";
import {
  ensureSettingsForNewUser,
  getUserByEmail,
  getUserById,
  type PublicUser,
} from "./users";
import { PLAN_FREE } from "@/lib/plan";
import {
  syntheticOAuthEmail,
  type OAuthProvider,
} from "@/lib/oauth-config";
import { decideOAuthLink } from "@/lib/oauth-link";

export class OAuthLinkError extends Error {
  readonly code: "provider_conflict";

  constructor(code: OAuthLinkError["code"]) {
    super(code);
    this.name = "OAuthLinkError";
    this.code = code;
  }
}

export type OAuthIdentity = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
};

type OAuthAccountRow = {
  id: string;
  provider: string;
  provider_user_id: string;
  user_id: string;
  email: string | null;
  created_at: string;
};

export function getOAuthAccount(provider: OAuthProvider, providerUserId: string) {
  return getDb()
    .prepare(
      `SELECT id, provider, provider_user_id, user_id, email, created_at
       FROM oauth_accounts
       WHERE provider = ? AND provider_user_id = ?`,
    )
    .get(provider, providerUserId) as OAuthAccountRow | undefined;
}

export function getOAuthAccountForUser(provider: OAuthProvider, userId: string) {
  return getDb()
    .prepare(
      `SELECT id, provider, provider_user_id, user_id, email, created_at
       FROM oauth_accounts
       WHERE provider = ? AND user_id = ?`,
    )
    .get(provider, userId) as OAuthAccountRow | undefined;
}

function insertOAuthAccount(input: {
  provider: OAuthProvider;
  providerUserId: string;
  userId: string;
  email: string | null;
}) {
  getDb()
    .prepare(
      `INSERT INTO oauth_accounts (id, provider, provider_user_id, user_id, email, created_at)
       VALUES (@id, @provider, @provider_user_id, @user_id, @email, @created_at)`,
    )
    .run({
      id: crypto.randomUUID(),
      provider: input.provider,
      provider_user_id: input.providerUserId,
      user_id: input.userId,
      email: input.email,
      created_at: new Date().toISOString(),
    });
}

function createOAuthOnlyUser(email: string): PublicUser {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, created_at, plan)
         VALUES (@id, @email, NULL, @created_at, @plan)`,
      )
      .run({
        id,
        email,
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

function verifiedEmail(identity: OAuthIdentity) {
  if (!identity.emailVerified || !identity.email) return null;
  return identity.email.trim().toLowerCase();
}

/**
 * Create or reuse a membership for a verified Google / LINE identity.
 * New users start on the Free plan, same as email signup.
 */
export function findOrLinkOAuthUser(identity: OAuthIdentity): PublicUser {
  const providerUserId = identity.providerUserId.trim();
  if (!providerUserId) {
    throw new Error("missing_provider_user_id");
  }

  const email = verifiedEmail(identity);
  const existingProvider = getOAuthAccount(identity.provider, providerUserId);
  const emailUser = email ? getUserByEmail(email) : undefined;
  const emailProvider = emailUser
    ? getOAuthAccountForUser(identity.provider, emailUser.id)
    : undefined;

  const decision = decideOAuthLink({
    existingByProviderUserId: existingProvider?.user_id ?? null,
    existingByVerifiedEmail: emailUser
      ? {
          userId: emailUser.id,
          existingProviderSubject: emailProvider?.provider_user_id ?? null,
        }
      : null,
  });

  if (decision.action === "login") {
    const user = getUserById(decision.userId);
    if (!user) throw new Error("oauth_user_missing");
    return user;
  }

  if (decision.action === "conflict") {
    throw new OAuthLinkError("provider_conflict");
  }

  if (decision.action === "link") {
    insertOAuthAccount({
      provider: identity.provider,
      providerUserId,
      userId: decision.userId,
      email,
    });
    const user = getUserById(decision.userId);
    if (!user) throw new Error("oauth_user_missing");
    return user;
  }

  const accountEmail = email ?? syntheticOAuthEmail(identity.provider, providerUserId);
  const created = createOAuthOnlyUser(accountEmail);
  insertOAuthAccount({
    provider: identity.provider,
    providerUserId,
    userId: created.id,
    email,
  });
  return created;
}
