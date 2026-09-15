import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminShell } from "@/components/admin-shell";
import { getAdminReview } from "@/db/admin";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminReviewDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const review = getAdminReview(id);
  if (!review) notFound();

  const owner = review.userEmail
    ? review.userEmail
    : `guest ${review.guestId}`;

  const fields = [
    ["Energy", review.energy],
    ["Drain", review.drain],
    ["Less of", review.lessOf],
    ["Priorities", review.priorities],
    ["Summary", review.summary],
  ] as const;

  return (
    <AdminShell title="Review">
      <p className="text-sm">
        <Link href="/admin/reviews" className="text-muted hover:text-foreground">
          ← Reviews
        </Link>
      </p>
      <article className="mt-6 rounded-[1.75rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <p className="text-sm text-muted">
          {new Date(review.createdAt).toLocaleString("en")} · {review.locale ?? "no locale"}
        </p>
        <p className="mt-2 text-sm text-muted">Owner: {owner}</p>
        {review.feeling ? (
          <p className="mt-2 text-sm text-muted">Feeling {review.feeling} of 5</p>
        ) : null}

        <dl className="mt-8 space-y-6">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-relaxed">
                {value.trim() || "—"}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10">
          <AdminDeleteButton
            endpoint={`/api/admin/reviews/${encodeURIComponent(review.id)}`}
            confirmText="Delete this review?"
            label="Delete review"
            redirectTo="/admin/reviews"
          />
        </div>
      </article>
    </AdminShell>
  );
}
