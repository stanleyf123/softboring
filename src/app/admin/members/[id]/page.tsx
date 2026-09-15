import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminPlanButtons } from "@/components/admin-plan-buttons";
import { AdminShell } from "@/components/admin-shell";
import { getAdminMember, listAdminReviewsForUser } from "@/db/admin";
import { listPaymentsForUser } from "@/db/payments";
import { listAdminWallNotesForUser } from "@/db/wall";
import { adminCopy, paymentKindLabel, paymentStatusLabel } from "@/lib/admin-copy";
import {
  formatAdminWhen,
  formatPaymentAmount,
  planLabel,
} from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminMemberDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const member = getAdminMember(id);
  if (!member) notFound();

  const reviews = listAdminReviewsForUser(member.id);
  const notes = listAdminWallNotesForUser(member.id);
  const payments = listPaymentsForUser(member.id);
  const copy = adminCopy.member;
  const dash = adminCopy.common.dash;

  const fields = [
    [copy.email, member.email],
    [copy.plan, planLabel(member.plan, member.planStatus)],
    [copy.subscriptionStatus, member.planStatus ?? dash],
    [copy.created, formatAdminWhen(member.createdAt)],
    [copy.lastActive, formatAdminWhen(member.lastActive ?? member.createdAt)],
    [copy.planUpdated, formatAdminWhen(member.planUpdatedAt)],
    [copy.stripeCustomer, member.stripeCustomerId ?? dash],
    [copy.stripeSubscription, member.stripeSubscriptionId ?? dash],
    [copy.stripePrice, member.stripePriceId ?? dash],
    [copy.reviews, String(member.reviewCount)],
    [copy.wallNotes, String(member.wallNoteCount)],
  ] as const;

  return (
    <AdminShell title={copy.title} wide>
      <p className="text-sm">
        <Link href="/admin/members" className="text-muted hover:text-foreground">
          {copy.back}
        </Link>
      </p>

      <article className="mt-6 rounded-[1.75rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <h2 className="font-display text-2xl tracking-tight">{member.email}</h2>
        <p className="mt-3">
          <span
            className={
              member.displayPlan === "soft_plus"
                ? "inline-flex rounded-full bg-mint px-3 py-1 text-sm font-medium"
                : "inline-flex rounded-full bg-peach px-3 py-1 text-sm"
            }
          >
            {planLabel(member.plan, member.planStatus)}
          </span>
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 break-all text-sm leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-sm text-muted">
          {copy.planHint}
        </p>
        <div className="mt-4">
          <AdminPlanButtons userId={member.id} email={member.email} />
        </div>
        <div className="mt-4">
          <AdminDeleteButton
            endpoint={`/api/admin/users/${encodeURIComponent(member.id)}`}
            confirmText={adminCopy.members.deleteConfirm(member.email)}
            label={copy.deleteMember}
            redirectTo="/admin/members"
          />
        </div>
      </article>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">{copy.reviewsHeading}</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            {copy.reviewsEmpty}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-normal">{copy.when}</th>
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
                    <td className="px-5 py-3">{review.locale ?? dash}</td>
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
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">{copy.wallHeading}</h2>
        {notes.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            {copy.wallEmpty}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-normal">{copy.when}</th>
                  <th className="px-5 py-3 font-normal">{copy.summary}</th>
                  <th className="px-5 py-3 font-normal">{copy.praise}</th>
                  <th className="px-5 py-3 font-normal">{copy.hidden}</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatAdminWhen(note.createdAt)}
                    </td>
                    <td className="px-5 py-3">{note.summary.trim() || copy.quietWeek}</td>
                    <td className="px-5 py-3">{note.praiseCount}</td>
                    <td className="px-5 py-3">{note.hidden ? copy.yes : copy.no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">{copy.paymentsHeading}</h2>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            {copy.paymentsEmpty}
          </p>
        ) : (
          <PaymentTable payments={payments} />
        )}
      </section>
    </AdminShell>
  );
}

function PaymentTable({
  payments,
}: {
  payments: ReturnType<typeof listPaymentsForUser>;
}) {
  const copy = adminCopy.member;
  return (
    <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-normal">{copy.when}</th>
            <th className="px-5 py-3 font-normal">{copy.kind}</th>
            <th className="px-5 py-3 font-normal">{copy.status}</th>
            <th className="px-5 py-3 font-normal">{copy.amount}</th>
            <th className="px-5 py-3 font-normal">{copy.description}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-line/70 last:border-0">
              <td className="px-5 py-3 whitespace-nowrap text-muted">
                {formatAdminWhen(payment.createdAt)}
              </td>
              <td className="px-5 py-3">{paymentKindLabel(payment.kind)}</td>
              <td className="px-5 py-3">{paymentStatusLabel(payment.status)}</td>
              <td className="px-5 py-3">
                {formatPaymentAmount(payment.amountCents, payment.currency)}
              </td>
              <td className="px-5 py-3">{payment.description ?? adminCopy.common.dash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
