import { SoftLostIllustration } from "@/components/soft-lost-illu";
import Link from "next/link";
import "./globals.css";

const locales = [
  { href: "/en", wall: "/en/wall", homeLabel: "Home", wallLabel: "Soft Wall" },
  { href: "/zh-tw", wall: "/zh-tw/wall", homeLabel: "首頁", wallLabel: "軟軟牆" },
  { href: "/ja", wall: "/ja/wall", homeLabel: "ホーム", wallLabel: "ソフトウォール" },
] as const;

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="bg-background px-6 py-16 text-foreground">
        <section
          className="mx-auto max-w-lg rounded-[2rem] bg-cream px-8 py-12 shadow-card"
          data-soft-not-found=""
        >
          <SoftLostIllustration />
          <h1 className="mt-6 font-display text-3xl tracking-tight">This page wandered off.</h1>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            The kettle is still on. This address just isn&apos;t a page we keep.
          </p>
          <ul className="mt-8 space-y-3">
            {locales.map((locale) => (
              <li key={locale.href} className="flex flex-wrap gap-3">
                <Link
                  href={locale.href}
                  className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
                >
                  {locale.homeLabel}
                </Link>
                <Link
                  href={locale.wall}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted"
                >
                  {locale.wallLabel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </body>
    </html>
  );
}
