export const NIGHT_COOKIE = "softboring_night";
export const NIGHT_STORAGE_KEY = "softboring.night.v1";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readNightCookie(value: string | undefined | null) {
  return value === "1";
}

/** Account wins. An explicit cookie wins over a leftover local note. */
export function nightSource(input: {
  signedIn: boolean;
  cookieValue: string | undefined | null;
}) {
  if (input.signedIn) return "account" as const;
  if (input.cookieValue === "0" || input.cookieValue === "1") return "cookie" as const;
  return "local" as const;
}

export function nightCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: YEAR_SECONDS,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export function clientNightCookie(on: boolean) {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `${NIGHT_COOKIE}=${on ? "1" : "0"}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax${secure}`;
}

/** Paint a stored local preference before React, only when the server had neither account nor cookie. */
export const NIGHT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.nightSource!=="local")return;if(localStorage.getItem(${JSON.stringify(NIGHT_STORAGE_KEY)})==="1")d.dataset.night="on";}catch(e){}})();`;

export function applyNightPreference(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.dataset.night = "on";
  else delete document.documentElement.dataset.night;
  try {
    window.localStorage.setItem(NIGHT_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode can refuse storage; the cookie still carries the look */
  }
  document.cookie = clientNightCookie(on);
}
