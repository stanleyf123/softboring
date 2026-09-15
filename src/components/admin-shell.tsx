import { AdminLogoutButton } from "@/components/admin-logout-button";
import { adminCopy } from "@/lib/admin-copy";
import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/admin", label: adminCopy.nav.dashboard },
  { href: "/admin/members", label: adminCopy.nav.members },
  { href: "/admin/payments", label: adminCopy.nav.payments },
  { href: "/admin/reviews", label: adminCopy.nav.reviews },
  { href: "/admin/wall", label: adminCopy.nav.wall },
];

export function AdminShell({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-4xl"} px-6 py-8`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{adminCopy.brand}</p>
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-1 rounded-full bg-paper/80 px-2 py-1.5 text-sm shadow-card">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-muted hover:bg-peach/80 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <AdminLogoutButton />
        </nav>
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}
