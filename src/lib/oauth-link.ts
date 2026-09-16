export type OAuthLinkDecision =
  | { action: "login"; userId: string }
  | { action: "link"; userId: string }
  | { action: "create" }
  | { action: "conflict"; reason: "email_has_other_provider" };

/**
 * Account linking policy (also documented in the PR / README):
 *
 * 1. A (provider, subject) already in oauth_accounts always signs in as that
 *    user. Never move the subject onto a different account.
 * 2. Else, a verified email that already has a user is linked to that user,
 *    unless the user already has a *different* subject for the same provider.
 * 3. Else create a new Free user.
 */
export function decideOAuthLink(input: {
  existingByProviderUserId: string | null;
  existingByVerifiedEmail: {
    userId: string;
    existingProviderSubject: string | null;
  } | null;
}): OAuthLinkDecision {
  if (input.existingByProviderUserId) {
    return { action: "login", userId: input.existingByProviderUserId };
  }

  const byEmail = input.existingByVerifiedEmail;
  if (!byEmail) return { action: "create" };

  if (
    byEmail.existingProviderSubject &&
    byEmail.existingProviderSubject.length > 0
  ) {
    return { action: "conflict", reason: "email_has_other_provider" };
  }

  return { action: "link", userId: byEmail.userId };
}
