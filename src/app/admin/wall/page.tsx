import { AdminHideButton } from "@/components/admin-hide-button";
import { AdminShell } from "@/components/admin-shell";
import { listAdminWallNotes } from "@/db/wall";
import { adminCopy } from "@/lib/admin-copy";
import { formatAdminWhen } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminWallPage() {
  await requireAdmin();
  const notes = listAdminWallNotes();
  const copy = adminCopy.wall;

  return (
    <AdminShell title={copy.title}>
      {notes.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="font-display text-xl tracking-tight">{copy.empty}</p>
          <p className="mt-2 text-sm text-muted">會員把週次釘上牆後，會出現在這裡。</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">{copy.when}</th>
                <th className="px-5 py-3 font-normal">{copy.owner}</th>
                <th className="px-5 py-3 font-normal">{copy.summary}</th>
                <th className="px-5 py-3 font-normal">{copy.praise}</th>
                <th className="px-5 py-3 font-normal">{copy.flags}</th>
                <th className="px-5 py-3 font-normal">{copy.hidden}</th>
                <th className="px-5 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr
                  key={note.id}
                  className={`border-b border-line/70 last:border-0 ${
                    note.flagCount > 0 ? "bg-blush/30" : ""
                  }`}
                >
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {formatAdminWhen(note.createdAt)}
                  </td>
                  <td className="px-5 py-3 break-all">{note.userEmail ?? adminCopy.common.dash}</td>
                  <td className="px-5 py-3">{note.summary.trim() || copy.quietWeek}</td>
                  <td className="px-5 py-3">{note.praiseCount}</td>
                  <td className="px-5 py-3">
                    {note.flagCount > 0 ? copy.flagged(note.flagCount) : copy.no}
                  </td>
                  <td className="px-5 py-3">{note.hidden ? copy.yes : copy.no}</td>
                  <td className="px-5 py-3">
                    <AdminHideButton
                      endpoint={`/api/admin/wall/${encodeURIComponent(note.id)}`}
                      hidden={note.hidden}
                    />
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
