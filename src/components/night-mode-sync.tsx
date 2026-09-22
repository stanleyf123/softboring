"use client";

import { NIGHT_STORAGE_KEY, clientNightCookie } from "@/lib/night-mode";
import { useEffect } from "react";

/**
 * Account and an explicit cookie win. A local-only note is kept, then written
 * into the cookie so the next paint does not flash.
 */
export function NightModeSync({
  night,
  source,
}: {
  night: boolean;
  source: "account" | "cookie" | "local";
}) {
  useEffect(() => {
    let on = night;
    if (source === "local") {
      try {
        const stored = window.localStorage.getItem(NIGHT_STORAGE_KEY);
        if (stored === "1") on = true;
        if (stored === "0") on = false;
      } catch {
        on = night;
      }
    }
    if (on) document.documentElement.dataset.night = "on";
    else delete document.documentElement.dataset.night;
    try {
      window.localStorage.setItem(NIGHT_STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* the cookie below is enough for the next visit */
    }
    document.cookie = clientNightCookie(on);
  }, [night, source]);

  return null;
}
