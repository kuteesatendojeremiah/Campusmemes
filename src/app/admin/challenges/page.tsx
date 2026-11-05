import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, fmtDate, inputCls } from "@/components/admin-ui";
import { addChallenge } from "../actions";

export default async function Challenges() {
  const { db } = await requireAdmin();
  const [{ data: challenges }, { data: sponsors }, { data: templates }, { data: entries }] = await Promise.all([
    db.from("challenges").select("id,title,starts_at,ends_at,prize,finalized_at,sponsor:sponsors(name)").order("starts_at", { ascending: false }),
    db.from("sponsors").select("id,name").eq("active", true),
    db.from("templates").select("id,name").eq("active", true).order("name"),
    db.from("memes").select("challenge_id").not("challenge_id", "is", null),
  ]);
  const n = new Map<string, number>();
  (entries ?? []).forEach((e) => n.set(e.challenge_id, (n.get(e.challenge_id) ?? 0) + 1));

  return (
    <>
      <H1>Challenges</H1>
      <Card title="New challenge">
        <form action={addChallenge} className="grid gap-2 md:grid-cols-2">
          <input name="title" placeholder="Title (e.g. Dead Semester Week)" required className={inputCls} />
          <input name="prize" placeholder="Prize" className={inputCls} />
          <textarea name="description" placeholder="Description" className={`${inputCls} md:col-span-2`} />
          <label>Starts <input type="datetime-local" name="starts_at" required className={inputCls} /></label>
          <label>Ends <input type="datetime-local" name="ends_at" required className={inputCls} /></label>
          <select name="template_id" className={inputCls}><option value="">No set template</option>{(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select name="sponsor_id" className={inputCls}><option value="">No sponsor</option>{(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input name="amount_paid" type="number" placeholder="Amount paid by sponsor (UGX)" className={inputCls} />
          <button className={`${btnCls} md:col-span-2`}>Create challenge</button>
        </form>
      </Card>
      <Card>
        <Table head={["Title", "Dates", "Sponsor", "Prize", "Entries", "Status"]}>
          {(challenges ?? []).map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>{fmtDate(c.starts_at)} – {fmtDate(c.ends_at)}</td>
              <td>{(c.sponsor as unknown as { name: string } | null)?.name ?? "—"}</td>
              <td>{c.prize ?? "—"}</td>
              <td>{n.get(c.id) ?? 0}</td>
              <td>{c.finalized_at ? "Winners awarded" : new Date(c.ends_at) < new Date() ? "Ended" : "Running"}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
