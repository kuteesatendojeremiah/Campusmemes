import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, fmtDate, ghostBtn, inputCls } from "@/components/admin-ui";
import { addPack, addSticker, addTemplate, toggleTemplate } from "../actions";

export default async function Templates() {
  await connection();
  const { db } = await requireAdmin();
  const [{ data: templates }, { data: sponsors }, { data: packs }] = await Promise.all([
    db.from("templates").select("id,name,image_url,uses_count,active,premium_only,sponsored_from,sponsored_until,sponsor:sponsors(name)").order("created_at", { ascending: false }),
    db.from("sponsors").select("id,name").eq("active", true),
    db.from("sticker_packs").select("id,name,premium_only,sponsor:sponsors(name),stickers(id,image_url)"),
  ]);
  const sponsorSelect = (
    <select name="sponsor_id" className={inputCls}>
      <option value="">No sponsor</option>
      {(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );

  return (
    <>
      <H1>Templates and stickers</H1>
      <Card title="Add a template">
        <form action={addTemplate} className="flex flex-wrap items-end gap-2">
          <input name="name" placeholder="Name" required className={inputCls} />
          <input type="file" name="file" accept="image/*" className={inputCls} />
          <input name="url" placeholder="…or image URL" className={inputCls} />
          {sponsorSelect}
          <label className="text-xs">Sponsored from <input type="date" name="from" className={inputCls} /></label>
          <label className="text-xs">until <input type="date" name="until" className={inputCls} /></label>
          <label className="text-xs"><input type="checkbox" name="premium_only" /> Premium only</label>
          <button className={btnCls}>Add</button>
        </form>
      </Card>
      <Card title="Templates">
        <Table head={["", "Name", "Sponsor", "Window", "Memes made", "Active", ""]}>
          {(templates ?? []).map((t) => (
            <tr key={t.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <td><img src={t.image_url} alt="" className="h-10 w-10 rounded object-cover" /></td>
              <td>{t.name}{t.premium_only ? " ⭐" : ""}</td>
              <td>{(t.sponsor as unknown as { name: string } | null)?.name ?? "—"}</td>
              <td>{t.sponsored_from ? `${fmtDate(t.sponsored_from)} – ${fmtDate(t.sponsored_until)}` : "—"}</td>
              <td>{t.uses_count}</td>
              <td>{t.active ? "Yes" : "No"}</td>
              <td>
                <form action={toggleTemplate}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="active" value={String(t.active)} />
                  <button className={ghostBtn}>{t.active ? "Hide" : "Show"}</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Sticker packs">
        <form action={addPack} className="mb-4 flex flex-wrap items-end gap-2">
          <input name="name" placeholder="Pack name" required className={inputCls} />
          {sponsorSelect}
          <label className="text-xs">from <input type="date" name="from" className={inputCls} /></label>
          <label className="text-xs">until <input type="date" name="until" className={inputCls} /></label>
          <label className="text-xs"><input type="checkbox" name="premium_only" /> Premium only</label>
          <button className={btnCls}>Add pack</button>
        </form>
        {(packs ?? []).map((p) => (
          <div key={p.id} className="mb-3 rounded-lg border border-gray-200 p-3">
            <p className="font-semibold">{p.name} <span className="text-xs text-gray-500">{(p.sponsor as unknown as { name: string } | null)?.name ?? ""}</span></p>
            <div className="my-2 flex flex-wrap gap-2">
              {(p.stickers as unknown as { id: string; image_url: string }[]).map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.id} src={s.image_url} alt="" className="h-10 w-10 object-contain" />
              ))}
            </div>
            <form action={addSticker} className="flex gap-2">
              <input type="hidden" name="pack_id" value={p.id} />
              <input type="file" name="file" accept="image/*" required className={inputCls} />
              <button className={ghostBtn}>Add sticker</button>
            </form>
          </div>
        ))}
      </Card>
    </>
  );
}
