import { requireAdmin } from "@/lib/admin";
import { Card, H1, Stat, Table } from "@/components/admin-ui";

const day = (iso: string) => iso.slice(0, 10);
const count = (rows: { created_at: string }[], fmt: (s: string) => string) => {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(fmt(r.created_at), (m.get(fmt(r.created_at)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
};

export default async function Overview() {
  const { db } = await requireAdmin();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const startToday = new Date(new Date().toISOString().slice(0, 10)).toISOString();
  const since1y = new Date(Date.now() - 365 * 86_400_000).toISOString();

  const [users, memes, reports, opens, posts, shares, ledger] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("memes").select("id", { count: "exact", head: true }),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("analytics_events").select("user_id").eq("event", "app_open").gte("created_at", startToday),
    db.from("memes").select("created_at").gte("created_at", since7),
    db.from("analytics_events").select("created_at").eq("event", "share").gte("created_at", since7),
    db.from("ledger").select("created_at,amount,kind").eq("status", "completed").in("kind", ["premium", "platform_fee", "sponsor_payment"]).gte("created_at", since1y),
  ]);

  const dau = new Set((opens.data ?? []).map((o) => o.user_id)).size;
  const revenue = new Map<string, number>();
  (ledger.data ?? []).forEach((l) => revenue.set(l.created_at.slice(0, 7), (revenue.get(l.created_at.slice(0, 7)) ?? 0) + Number(l.amount)));

  return (
    <>
      <H1>Overview</H1>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={users.count ?? 0} />
        <Stat label="Memes" value={memes.count ?? 0} />
        <Stat label="Active today" value={dau} />
        <Stat label="Open reports" value={reports.count ?? 0} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Posts per day (7 days)">
          <Table head={["Day", "Posts"]}>{count(posts.data ?? [], day).map(([d, n]) => <tr key={d}><td>{d}</td><td>{n}</td></tr>)}</Table>
        </Card>
        <Card title="Shares per day (7 days)">
          <Table head={["Day", "Shares"]}>{count(shares.data ?? [], day).map(([d, n]) => <tr key={d}><td>{d}</td><td>{n}</td></tr>)}</Table>
        </Card>
        <Card title="Revenue per month (UGX)">
          <Table head={["Month", "Revenue"]}>
            {[...revenue.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, v]) => <tr key={m}><td>{m}</td><td>{v.toLocaleString()}</td></tr>)}
          </Table>
          {revenue.size === 0 && <p className="text-xs text-gray-500">No revenue yet.</p>}
        </Card>
      </div>
    </>
  );
}
