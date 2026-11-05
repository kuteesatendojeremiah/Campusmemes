import { requireAdmin } from "@/lib/admin";
import { sponsorReports } from "@/lib/sponsor-report";
import { Card, H1, Table, btnCls } from "@/components/admin-ui";

export default async function Reports() {
  const { db } = await requireAdmin();
  const rows = await sponsorReports(db);
  return (
    <>
      <H1>Sponsor reports</H1>
      <p className="mb-3 text-xs text-gray-500">Totals only, with no personal data about users. Download as CSV, or use your browser&apos;s Print → Save as PDF on this page.</p>
      <a href="/admin/reports/export" className={`${btnCls} mb-4 inline-block`}>Download CSV</a>
      <Card>
        <Table head={["Sponsor", "Impressions", "Taps", "Challenge entries", "Memes from templates", "Laughs", "Shares"]}>
          {rows.map((r) => (
            <tr key={r.sponsor}>
              <td>{r.sponsor}</td><td>{r.impressions}</td><td>{r.taps}</td><td>{r.challengeEntries}</td><td>{r.memesFromTemplates}</td><td>{r.laughs}</td><td>{r.shares}</td>
            </tr>
          ))}
        </Table>
        {rows.length === 0 && <p className="text-gray-500">No sponsors yet.</p>}
      </Card>
    </>
  );
}
