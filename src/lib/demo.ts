/** Demo/test Soft+ accounts that keep Soft Wall lively. See docs/demo-bots.md. */

export const DEMO_EMAIL_DOMAIN = "softboring.demo";

export function isDemoEmail(email: string | null | undefined) {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  return trimmed.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}
