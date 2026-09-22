import { AdminGiftMintForm, AdminGiftTable } from "@/components/admin-gift-panel";
import { AdminShell } from "@/components/admin-shell";
import { countGiftCodes, countUnusedGiftCodes, listGiftCodes } from "@/db/gift-codes";
import { requireAdmin } from "@/lib/admin";
import { adminCopy } from "@/lib/admin-copy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminGiftsPage() {
  await requireAdmin();
  const codes = listGiftCodes(200);
  const total = countGiftCodes();
  const unused = countUnusedGiftCodes();
  const copy = adminCopy.gifts;

  return (
    <AdminShell title={copy.title} wide>
      <p className="max-w-2xl text-sm leading-relaxed text-muted">{copy.lead}</p>
      <p className="mt-3 text-sm text-muted">
        {copy.summary(total, unused)}
      </p>
      <div className="mt-8">
        <AdminGiftMintForm />
      </div>
      <AdminGiftTable codes={codes} />
    </AdminShell>
  );
}
