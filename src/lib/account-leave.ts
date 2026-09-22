/** Typed exactly. The brand, not a translated warning. */
export const LEAVE_PHRASE = "Soft Boring";

export type LeaveConfirmResult = "ok" | "phrase" | "email";

export function leaveConfirmationMatches(input: {
  phrase: unknown;
  email: unknown;
  accountEmail: string;
}): LeaveConfirmResult {
  if (typeof input.phrase !== "string" || input.phrase !== LEAVE_PHRASE) {
    return "phrase";
  }
  if (typeof input.email !== "string") return "email";
  const typed = input.email.trim().toLowerCase();
  const account = input.accountEmail.trim().toLowerCase();
  if (!typed || typed !== account) return "email";
  return "ok";
}
