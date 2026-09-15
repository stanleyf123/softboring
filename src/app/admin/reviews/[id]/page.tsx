import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminShell } from "@/components/admin-shell";
import { getAdminReview } from "@/db/admin";
import { adminCopy } from "@/lib/admin-copy";
import { formatAdminWhen } from "@/lib/admin-format";
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
  const copy = adminCopy.reviews;

  const owner = review.userEmail
    ? review.userEmail
    : copy.guest(review.guestId);

  const fields = [
    [copy.energy, review.energy],
    [copy.drain, review.drain],
    [copy.lessOf, review.lessOf],
    [copy.priorities, review.priorities],
    [copy.summaryField, review.summary],
  ] as const;

  return (
    <AdminShell title={copy.detailTitle}>
      <p className="text-sm">
        <Link href="/admin/reviews" className="text-muted hover:text-foreground">
          {copy.back}
        </Link>
      </p>
      <article className="mt-6 rounded-[1.75rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <p className="text-sm text-muted">
          {formatAdminWhen(review.createdAt)} · {review.locale ?? copy.noLocale}
        </p>
        <p className="mt-2 text-sm text-muted">
          {copy.ownerLabel}：{owner}
        </p>
        {review.feeling ? (
          <p className="mt-2 text-sm text-muted">{copy.feeling(review.feeling)}</p>
        ) : null}

        <dl className="mt-8 space-y-6">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-relaxed">
                {value.trim() || adminCopy.common.dash}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10">
          <AdminDeleteButton
            endpoint={`/api/admin/reviews/${encodeURIComponent(review.id)}`}
            confirmText={copy.deleteConfirm}
            label={copy.deleteReview}
            redirectTo="/admin/reviews"
          />
        </div>
      </article>
    </AdminShell>
  );
}
