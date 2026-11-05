import { requireAdmin } from "@/lib/admin";
import { sponsorReports } from "@/lib/sponsor-report";

export async function GET() {
  const { db } = await requireAdmin();
  const rows = await sponsorReports(db);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    ["Sponsor", "Impressions", "Taps", "Challenge entries", "Memes from templates", "Laughs", "Shares"],
    ...rows.map((r) => [r.sponsor, r.impressions, r.taps, r.challengeEntries, r.memesFromTemplates, r.laughs, r.shares]),
  ]
    .map((r) => r.map(esc).join(","))
    .join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sponsor-report.csv"' },
  });
}
