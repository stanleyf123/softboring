export class AuthError extends Error {
  readonly code: "invalid_email" | "weak_password" | "invalid_credentials" | "email_taken";

  constructor(
    code: AuthError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new AuthError("invalid_email", "That does not look like an email address.");
  }
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new AuthError("invalid_email", "That does not look like an email address.");
  }
  return email;
}

export function parseNewPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 72) {
    throw new AuthError("weak_password", "Use 8 to 72 characters.");
  }
  return value;
}

export function parseLoginPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 1 || value.length > 72) {
    throw new AuthError("invalid_credentials", "Email or password is not right.");
  }
  return value;
}
