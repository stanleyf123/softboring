import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Native addon; must stay external for `next start` on the VPS.
  serverExternalPackages: ["better-sqlite3", "bcryptjs", "stripe", "nodemailer"],
};

export default withNextIntl(nextConfig);
