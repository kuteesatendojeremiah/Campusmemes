import { requireAdmin } from "@/lib/admin";
import { Card, H1, btnCls, fmtDate, ghostBtn, inputCls } from "@/components/admin-ui";
import { addCampaign, inviteCreator } from "../actions";

export default async function Campaigns() {
  const { db } = await requireAdmin();
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id,brand,brief,fee,starts_at,ends_at,campaign_creators(status,payout,user:profiles(alias)),campaign_memes(meme_id)")
    .order("created_at", { ascending: false });
  const { data: top } = await db.from("memes").select("author:profiles(alias),laugh_count").order("laugh_count", { ascending: false }).limit(10);
  const topAliases = [...new Set((top ?? []).map((t) => (t.author as unknown as { alias: string } | null)?.alias).filter(Boolean))];

  return (
    <>
      <H1>Meme marketing campaigns</H1>
      <Card title="New campaign">
        <form action={addCampaign} className="grid gap-2 md:grid-cols-2">
          <input name="brand" placeholder="Brand" required className={inputCls} />
          <input name="fee" type="number" placeholder="Fee paid by brand (UGX)" className={inputCls} />
          <textarea name="brief" placeholder="Campaign brief" className={`${inputCls} md:col-span-2`} />
          <label>Starts <input type="date" name="starts_at" className={inputCls} /></label>
          <label>Ends <input type="date" name="ends_at" className={inputCls} /></label>
          <button className={`${btnCls} md:col-span-2`}>Create campaign</button>
        </form>
      </Card>
      {topAliases.length > 0 && <p className="mb-3 text-xs text-gray-500">Top creators right now: {topAliases.join(", ")}</p>}
      {(campaigns ?? []).map((c) => {
        const creators = c.campaign_creators as unknown as { status: string; payout: number; user: { alias: string } }[];
        return (
          <Card key={c.id} title={`${c.brand} — fee UGX ${Number(c.fee).toLocaleString()}`}>
            <p className="mb-2 text-gray-600">{c.brief}</p>
            <p className="mb-2 text-xs text-gray-500">{fmtDate(c.starts_at)} – {fmtDate(c.ends_at)} · {(c.campaign_memes as unknown as unknown[]).length} memes produced</p>
            <ul className="mb-3 text-sm">
              {creators.map((cr, i) => <li key={i}>{cr.user.alias} — {cr.status} — payout UGX {Number(cr.payout).toLocaleString()}</li>)}
              {creators.length === 0 && <li className="text-gray-500">No creators invited yet.</li>}
            </ul>
            <form action={inviteCreator} className="flex flex-wrap gap-2">
              <input type="hidden" name="campaign_id" value={c.id} />
              <input name="alias" placeholder="@alias to invite" required className={inputCls} />
              <input name="payout" type="number" placeholder="Payout (UGX)" className={inputCls} />
              <button className={ghostBtn}>Invite creator</button>
            </form>
          </Card>
        );
      })}
    </>
  );
}
