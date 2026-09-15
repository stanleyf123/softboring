import { redirect } from "next/navigation";
import { getAdminToken, isAdminRequest } from "@/lib/admin";
import { safeAdminPath } from "@/lib/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  if (await isAdminRequest()) {
    redirect("/admin");
  }

  const query = await searchParams;
  const returnTo = safeAdminPath(query.return_to);
  const configured = Boolean(getAdminToken());

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted">Soft Boring</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Admin sign in</h1>
      <p className="mt-4 leading-relaxed text-muted">
        This page is not linked from the public site. Use the token in{" "}
        <code className="rounded-md bg-peach/80 px-1.5 py-0.5 text-sm">ADMIN_TOKEN</code>.
      </p>

      {!configured ? (
        <p className="mt-8 rounded-[1.75rem] bg-paper px-6 py-6 leading-relaxed shadow-card">
          The server has no <code>ADMIN_TOKEN</code> yet. Set it in{" "}
          <code>.env.local</code> or <code>/etc/softboring.env</code>, then restart.
        </p>
      ) : (
        <form
          className="mt-8 rounded-[1.75rem] bg-paper px-6 py-8 shadow-card"
          action="/api/admin/session"
          method="post"
        >
          <input type="hidden" name="return_to" value={returnTo} />
          <label className="block">
            <span className="text-sm text-muted">Admin token</span>
            <input
              type="password"
              name="token"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-full border border-line bg-background px-5 py-3 outline-none focus:border-accent"
            />
          </label>
          {query.error ? (
            <p className="mt-4 text-sm text-accent" role="alert">
              That token did not match. Try again.
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-paper shadow-soft"
          >
            Sign in
          </button>
        </form>
      )}
    </main>
  );
}
