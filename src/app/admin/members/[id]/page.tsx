import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminPlanButtons } from "@/components/admin-plan-buttons";
import { AdminShell } from "@/components/admin-shell";
import { getAdminMember, listAdminReviewsForUser } from "@/db/admin";
import { listPaymentsForUser } from "@/db/payments";
import { listAdminWallNotesForUser } from "@/db/wall";
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

  const fields = [
    ["Email", member.email],
    ["Plan", planLabel(member.plan, member.planStatus)],
    ["Subscription status", member.planStatus ?? "—"],
    ["Created", formatAdminWhen(member.createdAt)],
    ["Last active", formatAdminWhen(member.lastActive ?? member.createdAt)],
    ["Plan updated", formatAdminWhen(member.planUpdatedAt)],
    ["Stripe customer", member.stripeCustomerId ?? "—"],
    ["Stripe subscription", member.stripeSubscriptionId ?? "—"],
    ["Stripe price", member.stripePriceId ?? "—"],
    ["Reviews", String(member.reviewCount)],
    ["Wall notes", String(member.wallNoteCount)],
  ] as const;

  return (
    <AdminShell title="Member" wide>
      <p className="text-sm">
        <Link href="/admin/members" className="text-muted hover:text-foreground">
          ← Members
        </Link>
      </p>

      <article className="mt-6 rounded-[1.75rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <h2 className="font-display text-2xl tracking-tight">{member.email}</h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 break-all text-sm leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-sm text-muted">
          Manual plan changes are for comps and support. They do not create a Stripe
          charge or subscription.
        </p>
        <div className="mt-4">
          <AdminPlanButtons userId={member.id} email={member.email} />
        </div>
        <div className="mt-4">
          <AdminDeleteButton
            endpoint={`/api/admin/users/${encodeURIComponent(member.id)}`}
            confirmText={`Delete ${member.email} and their reviews?`}
            label="Delete member"
            redirectTo="/admin/members"
          />
        </div>
      </article>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            No reviews yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-normal">When</th>
                  <th className="px-5 py-3 font-normal">Locale</th>
                  <th className="px-5 py-3 font-normal">Summary</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatAdminWhen(review.createdAt)}
                    </td>
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
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">Wall notes</h2>
        {notes.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            No wall notes yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-normal">When</th>
                  <th className="px-5 py-3 font-normal">Summary</th>
                  <th className="px-5 py-3 font-normal">Praise</th>
                  <th className="px-5 py-3 font-normal">Hidden</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatAdminWhen(note.createdAt)}
                    </td>
                    <td className="px-5 py-3">{note.summary.trim() || "A quiet week"}</td>
                    <td className="px-5 py-3">{note.praiseCount}</td>
                    <td className="px-5 py-3">{note.hidden ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl tracking-tight">Payments</h2>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-[1.75rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
            No payment records for this member yet.
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
  return (
    <div className="mt-3 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-normal">When</th>
            <th className="px-5 py-3 font-normal">Kind</th>
            <th className="px-5 py-3 font-normal">Status</th>
            <th className="px-5 py-3 font-normal">Amount</th>
            <th className="px-5 py-3 font-normal">Description</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-line/70 last:border-0">
              <td className="px-5 py-3 whitespace-nowrap text-muted">
                {formatAdminWhen(payment.createdAt)}
              </td>
              <td className="px-5 py-3">{payment.kind}</td>
              <td className="px-5 py-3">{payment.status}</td>
              <td className="px-5 py-3">
                {formatPaymentAmount(payment.amountCents, payment.currency)}
              </td>
              <td className="px-5 py-3">{payment.description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
