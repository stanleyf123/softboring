import { AdminShell } from "@/components/admin-shell";
import {
  isPaymentKind,
  isPaymentStatus,
  listPayments,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
} from "@/db/payments";
import { adminCopy, paymentKindLabel, paymentStatusLabel } from "@/lib/admin-copy";
import {
  formatAdminWhen,
  formatPaymentAmount,
} from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  searchParams: Promise<{
    kind?: string;
    status?: string;
    email?: string;
  }>;
};

export default async function AdminPaymentsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const kind = params.kind?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const email = params.email?.trim() ?? "";
  const payments = listPayments({
    kind: isPaymentKind(kind) ? kind : undefined,
    status: isPaymentStatus(status) ? status : undefined,
    email: email || undefined,
  });
  const filtered = Boolean(kind || status || email);
  const copy = adminCopy.payments;

  return (
    <AdminShell title={copy.title} wide>
      <form
        method="get"
        className="rounded-[1.75rem] bg-paper px-5 py-5 shadow-card sm:px-6"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">{copy.kind}</span>
            <select
              name="kind"
              defaultValue={isPaymentKind(kind) ? kind : ""}
              className="rounded-full border border-line bg-cream px-3 py-2"
            >
              <option value="">{copy.all}</option>
              {PAYMENT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {paymentKindLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">{copy.status}</span>
            <select
              name="status"
              defaultValue={isPaymentStatus(status) ? status : ""}
              className="rounded-full border border-line bg-cream px-3 py-2"
            >
              <option value="">{copy.all}</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {paymentStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block text-muted">{copy.email}</span>
            <input
              name="email"
              defaultValue={email}
              placeholder={copy.emailPlaceholder}
              className="w-full rounded-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-peach px-4 py-2 text-sm hover:bg-blush"
          >
            {copy.filter}
          </button>
          {filtered ? (
            <Link
              href="/admin/payments"
              className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              {copy.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {payments.length === 0 ? (
        <section className="mt-6 rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="font-display text-xl tracking-tight">
            {filtered ? copy.emptyFiltered : "還沒有付款紀錄"}
          </p>
          <p className="mt-2 text-muted">
            {filtered ? null : copy.empty}
          </p>
        </section>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">{copy.when}</th>
                <th className="px-5 py-3 font-normal">{copy.member}</th>
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
                  <td className="px-5 py-3 break-all">
                    {payment.userId ? (
                      <Link
                        href={`/admin/members/${encodeURIComponent(payment.userId)}`}
                        className="text-accent hover:text-foreground"
                      >
                        {payment.email ?? copy.memberFallback}
                      </Link>
                    ) : (
                      (payment.email ?? adminCopy.common.dash)
                    )}
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
      )}
    </AdminShell>
  );
}
