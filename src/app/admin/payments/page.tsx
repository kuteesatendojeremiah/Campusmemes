import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, fmtDate } from "@/components/admin-ui";

export default async function Payments() {
  const { db } = await requireAdmin();
  const { data } = await db.from("ledger").select("id,kind,amount,provider,provider_ref,status,created_at,user:profiles!user_id(alias)").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <H1>Payments ledger</H1>
      <p className="mb-3 text-xs text-gray-500">Every premium payment, tip, platform fee and withdrawal. Payments run in sandbox mode until a Mobile Money provider is connected.</p>
      <Card>
        <Table head={["Date", "Type", "User", "Amount (UGX)", "Provider", "Status"]}>
          {(data ?? []).map((l) => (
            <tr key={l.id}>
              <td>{fmtDate(l.created_at)}</td>
              <td>{l.kind}</td>
              <td>{(l.user as unknown as { alias: string } | null)?.alias ?? "—"}</td>
              <td>{Number(l.amount).toLocaleString()}</td>
              <td>{l.provider ?? "—"}</td>
              <td>{l.status}</td>
            </tr>
          ))}
        </Table>
        {(data ?? []).length === 0 && <p className="text-gray-500">No payments yet.</p>}
      </Card>
    </>
  );
}
