/**
 * Quiet response headers for every route.
 * The CSP stays narrow on purpose: frame the desk, block plugins, keep the base URL here.
 * Script and style policies are left open so the night-mode snippet and optional analytics still load.
 */

export const SOFT_CONTENT_SECURITY_POLICY = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

export const SOFT_PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()";

export function softSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: SOFT_CONTENT_SECURITY_POLICY },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Permissions-Policy", value: SOFT_PERMISSIONS_POLICY },
  ];
}
