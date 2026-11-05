import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, fmtDate, ghostBtn, inputCls } from "@/components/admin-ui";
import { addAd, toggleAd } from "../actions";

export default async function Ads() {
  const { db } = await requireAdmin();
  const [{ data: ads }, { data: sponsors }, { data: topics }, { data: events }] = await Promise.all([
    db.from("feed_ads").select("id,title,link_url,starts_at,ends_at,active,sponsor:sponsors(name)").order("starts_at", { ascending: false }),
    db.from("sponsors").select("id,name").eq("active", true),
    db.from("topics").select("id,name").eq("active", true),
    db.from("analytics_events").select("event,ad_id").in("event", ["ad_impression", "ad_tap"]).not("ad_id", "is", null),
  ]);
  const stat = (id: string, ev: string) => (events ?? []).filter((e) => e.ad_id === id && e.event === ev).length;

  return (
    <>
      <H1>Feed ads</H1>
      <p className="mb-3 text-xs text-gray-500">Shown no more than once every N memes (see Settings), always labelled &quot;Sponsored&quot;, never to Premium users. Switch the feature on in Settings.</p>
      <Card title="New ad card">
        <form action={addAd} className="grid gap-2 md:grid-cols-2">
          <select name="sponsor_id" required className={inputCls}><option value="">Sponsor…</option>{(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input name="title" placeholder="Headline" required className={inputCls} />
          <textarea name="body" placeholder="Short text" className={`${inputCls} md:col-span-2`} />
          <input name="link_url" type="url" placeholder="Link (https://…)" required className={inputCls} />
          <input type="file" name="file" accept="image/*" className={inputCls} />
          <label>Starts <input type="datetime-local" name="starts_at" required className={inputCls} /></label>
          <label>Ends <input type="datetime-local" name="ends_at" required className={inputCls} /></label>
          <fieldset className="md:col-span-2">
            <legend className="text-xs text-gray-500">Target topics (none = all)</legend>
            <div className="flex flex-wrap gap-3">{(topics ?? []).map((t) => <label key={t.id} className="text-xs"><input type="checkbox" name="topic_ids" value={t.id} /> {t.name}</label>)}</div>
          </fieldset>
          <button className={`${btnCls} md:col-span-2`}>Create ad</button>
        </form>
      </Card>
      <Card>
        <Table head={["Ad", "Sponsor", "Dates", "Impressions", "Taps", "Active", ""]}>
          {(ads ?? []).map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{(a.sponsor as unknown as { name: string } | null)?.name}</td>
              <td>{fmtDate(a.starts_at)} – {fmtDate(a.ends_at)}</td>
              <td>{stat(a.id, "ad_impression")}</td>
              <td>{stat(a.id, "ad_tap")}</td>
              <td>{a.active ? "Yes" : "No"}</td>
              <td>
                <form action={toggleAd}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(a.active)} />
                  <button className={ghostBtn}>{a.active ? "Pause" : "Resume"}</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
