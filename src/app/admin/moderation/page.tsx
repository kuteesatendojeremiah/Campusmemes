import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, fmtDate, ghostBtn } from "@/components/admin-ui";
import { moderate } from "../actions";

type Item = { id: string; kind: "meme" | "comment"; status: string; author: string; preview: React.ReactNode; reasons: string[] };

export default async function Moderation() {
  const { db } = await requireAdmin();
  const [{ data: reports }, { data: log }] = await Promise.all([
    db
      .from("reports")
      .select("reason,meme:memes(id,status,image_url,author:profiles(alias)),comment:comments(id,status,body,author:profiles(alias))")
      .eq("status", "open"),
    db.from("moderation_actions").select("action,note,created_at,target_user,admin_id").order("created_at", { ascending: false }).limit(30),
  ]);

  // group reports by item
  const items = new Map<string, Item>();
  for (const r of (reports ?? []) as unknown as { reason: string; meme: { id: string; status: string; image_url: string; author: { alias: string } } | null; comment: { id: string; status: string; body: string; author: { alias: string } } | null }[]) {
    const m = r.meme, c = r.comment;
    const id = m?.id ?? c!.id;
    const it = items.get(id) ?? {
      id,
      kind: m ? "meme" : "comment",
      status: (m ?? c)!.status,
      author: (m ?? c)!.author?.alias ?? "@deleted",
      preview: m ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image_url} alt="" className="h-20 w-20 rounded object-cover" />
      ) : (
        <span>{c!.body}</span>
      ),
      reasons: [] as string[],
    };
    it.reasons.push(r.reason);
    items.set(id, it);
  }

  return (
    <>
      <H1>Moderation queue</H1>
      <Card>
        <Table head={["Item", "By", "Status", "Reports", "Decision"]}>
          {[...items.values()].sort((a, b) => b.reasons.length - a.reasons.length).map((it) => (
            <tr key={it.id}>
              <td>{it.preview}</td>
              <td>{it.author}</td>
              <td>{it.status}</td>
              <td>{it.reasons.length}: {[...new Set(it.reasons)].join("; ")}</td>
              <td>
                <form action={moderate} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={it.id} />
                  <input type="hidden" name="kind" value={it.kind} />
                  <button name="decision" value="keep" className={ghostBtn}>Keep</button>
                  <button name="decision" value="remove" className={ghostBtn}>Remove</button>
                  <button name="decision" value="warn" className={ghostBtn}>Remove + warn</button>
                  <button name="decision" value="ban" className={`${ghostBtn} text-red-700`}>Remove + ban</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
        {items.size === 0 && <p className="text-gray-500">Nothing to review. 🎉</p>}
      </Card>

      <Card title="Audit log (latest 30)">
        <Table head={["When", "Action", "Target user", "Note"]}>
          {(log ?? []).map((l, i) => (
            <tr key={i}><td>{fmtDate(l.created_at)}</td><td>{l.action}</td><td className="font-mono text-xs">{l.target_user?.slice(0, 8) ?? "—"}</td><td>{l.note ?? ""}</td></tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
