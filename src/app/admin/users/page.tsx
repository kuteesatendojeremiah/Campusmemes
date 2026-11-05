import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, fmtDate, ghostBtn, inputCls } from "@/components/admin-ui";
import { userAction } from "../actions";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { db } = await requireAdmin();
  const { q = "" } = await searchParams;
  let query = db.from("profiles").select("id,alias,avatar,status,suspended_until,is_premium,created_at").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("alias", `%${q.replace(/[%_]/g, "")}%`);
  const { data: users } = await query;
  const { data: phones } = await db.from("user_private").select("user_id,phone").in("user_id", (users ?? []).map((u) => u.id));
  const phoneOf = new Map((phones ?? []).map((p) => [p.user_id, p.phone]));

  return (
    <>
      <H1>Users</H1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search alias" className={inputCls} />
        <button className={btnCls}>Search</button>
      </form>
      <Card>
        <Table head={["Alias", "Phone / email (admin only)", "Status", "Joined", "Actions"]}>
          {(users ?? []).map((u) => (
            <tr key={u.id}>
              <td>{u.avatar} {u.alias}{u.is_premium ? " ⭐" : ""}</td>
              <td className="font-mono text-xs">{phoneOf.get(u.id) ?? "—"}</td>
              <td>{u.status}{u.suspended_until ? ` until ${fmtDate(u.suspended_until)}` : ""}</td>
              <td>{fmtDate(u.created_at)}</td>
              <td>
                <form action={userAction} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <button name="action" value="warn" className={ghostBtn}>Warn</button>
                  <button name="action" value="suspend" className={ghostBtn}>Suspend 7d</button>
                  <button name="action" value="ban" className={`${ghostBtn} text-red-700`}>Ban</button>
                  {u.status !== "active" && <button name="action" value="unban" className={ghostBtn}>Restore</button>}
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
