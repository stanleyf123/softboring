import { AdminHideButton } from "@/components/admin-hide-button";
import { AdminShell } from "@/components/admin-shell";
import { listAdminWallNotes } from "@/db/wall";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminWallPage() {
  await requireAdmin();
  const notes = listAdminWallNotes();

  return (
    <AdminShell title="Soft Wall">
      {notes.length === 0 ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-10 shadow-card">
          <p className="text-muted">No wall notes yet.</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">When</th>
                <th className="px-5 py-3 font-normal">Owner</th>
                <th className="px-5 py-3 font-normal">Summary</th>
                <th className="px-5 py-3 font-normal">Praise</th>
                <th className="px-5 py-3 font-normal">Hidden</th>
                <th className="px-5 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {new Date(note.createdAt).toLocaleString("en")}
                  </td>
                  <td className="px-5 py-3 break-all">{note.userEmail ?? "—"}</td>
                  <td className="px-5 py-3">{note.summary.trim() || "A quiet week"}</td>
                  <td className="px-5 py-3">{note.praiseCount}</td>
                  <td className="px-5 py-3">{note.hidden ? "yes" : "no"}</td>
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
