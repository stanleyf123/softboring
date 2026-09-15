import { AdminShell } from "@/components/admin-shell";
import { listAdminReviews } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";
import { formatAdminWhen } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ownerLabel(review: { userEmail: string | null; guestId: string }) {
  if (review.userEmail) return review.userEmail;
  return adminCopy.reviews.guest(review.guestId);
}

export default async function AdminReviewsPage() {
  await requireAdmin();
  const reviews = listAdminReviews();
  const copy = adminCopy.reviews;

  return (
    <AdminShell title={copy.title}>
      {reviews.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="font-display text-xl tracking-tight">{copy.empty}</p>
          <p className="mt-2 text-sm text-muted">會員或訪客存檔後，回顧會列在這裡。</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">{copy.when}</th>
                <th className="px-5 py-3 font-normal">{copy.owner}</th>
                <th className="px-5 py-3 font-normal">{copy.locale}</th>
                <th className="px-5 py-3 font-normal">{copy.summary}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {formatAdminWhen(review.createdAt)}
                  </td>
                  <td className="px-5 py-3 break-all">{ownerLabel(review)}</td>
                  <td className="px-5 py-3">{review.locale ?? adminCopy.common.dash}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/reviews/${encodeURIComponent(review.id)}`}
                      className="text-accent hover:text-foreground"
                    >
                      {review.summary.trim() || copy.quietWeek}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
