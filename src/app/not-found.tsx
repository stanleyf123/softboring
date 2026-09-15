import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="bg-background px-6 py-16 text-foreground">
        <p>This page is not here.</p>
        <p className="mt-4">
          <Link href="/en" className="text-accent">
            Soft Boring
          </Link>
        </p>
      </body>
    </html>
  );
}
