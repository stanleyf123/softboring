import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Locale IDs must match URL prefixes. A `zh-TW` locale with prefix `/zh-tw`
  // is rewritten internally to `/zh-TW`, which Next.js 16 leaks as a 307 loop
  // when the server binds to 127.0.0.1 (the VPS systemd unit).
  locales: ["en", "zh-tw"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
