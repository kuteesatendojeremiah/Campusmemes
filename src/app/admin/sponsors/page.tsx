import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, ghostBtn, inputCls } from "@/components/admin-ui";
import { addSponsor, toggleSponsor } from "../actions";

export default async function Sponsors() {
  await connection();
  const { db } = await requireAdmin();
  const { data: sponsors } = await db.from("sponsors").select("id,name,logo_url,link_url,category,active").order("created_at", { ascending: false });
  return (
    <>
      <H1>Sponsors</H1>
      <Card title="Add a sponsor">
        <p className="mb-2 text-xs text-gray-500">Betting and gambling advertisers are not allowed and are rejected automatically.</p>
        <form action={addSponsor} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Brand name" required className={inputCls} />
          <input name="category" placeholder="Category (food, telecom…)" className={inputCls} />
          <input name="link_url" placeholder="Website link" className={inputCls} />
          <input type="file" name="file" accept="image/*" className={inputCls} />
          <button className={btnCls}>Add</button>
        </form>
      </Card>
      <Card>
        <Table head={["", "Brand", "Category", "Link", "Active", ""]}>
          {(sponsors ?? []).map((s) => (
            <tr key={s.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <td>{s.logo_url ? <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-contain" /> : null}</td>
              <td>{s.name}</td>
              <td>{s.category}</td>
              <td className="text-xs">{s.link_url}</td>
              <td>{s.active ? "Yes" : "No"}</td>
              <td>
                <form action={toggleSponsor}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <button className={ghostBtn}>{s.active ? "Pause" : "Resume"}</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
