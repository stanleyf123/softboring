import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh-TW"],
  defaultLocale: "en",
  localePrefix: {
    mode: "always",
    prefixes: {
      "zh-TW": "/zh-tw",
    },
  },
});

export type AppLocale = (typeof routing.locales)[number];
