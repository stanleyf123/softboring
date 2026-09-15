import { AdminShell } from "@/components/admin-shell";
import { listAdminReviews } from "@/db/admin";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ownerLabel(review: { userEmail: string | null; guestId: string }) {
  if (review.userEmail) return review.userEmail;
  return `guest ${review.guestId.slice(0, 8)}`;
}

export default async function AdminReviewsPage() {
  await requireAdmin();
  const reviews = listAdminReviews();

  return (
    <AdminShell title="Reviews">
      {reviews.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="text-muted">No reviews yet.</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">When</th>
                <th className="px-5 py-3 font-normal">Owner</th>
                <th className="px-5 py-3 font-normal">Locale</th>
                <th className="px-5 py-3 font-normal">Summary</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {new Date(review.createdAt).toLocaleString("en")}
                  </td>
                  <td className="px-5 py-3 break-all">{ownerLabel(review)}</td>
                  <td className="px-5 py-3">{review.locale ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/reviews/${encodeURIComponent(review.id)}`}
                      className="text-accent hover:text-foreground"
                    >
                      {review.summary.trim() || "A quiet week"}
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
