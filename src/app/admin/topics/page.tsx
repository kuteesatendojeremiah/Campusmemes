import { requireAdmin } from "@/lib/admin";
import { Card, H1, Table, btnCls, ghostBtn, inputCls } from "@/components/admin-ui";
import { addTopic, toggleTopic } from "../actions";

export default async function Topics() {
  const { db } = await requireAdmin();
  const { data: topics } = await db.from("topics").select("id,name,emoji,description,active").order("name");
  return (
    <>
      <H1>Topics</H1>
      <Card title="Add a topic">
        <form action={addTopic} className="flex flex-wrap gap-2">
          <input name="emoji" placeholder="😀" className={`${inputCls} w-16`} />
          <input name="name" placeholder="Name" required className={inputCls} />
          <input name="description" placeholder="What goes there" className={`${inputCls} min-w-64 flex-1`} />
          <button className={btnCls}>Add</button>
        </form>
      </Card>
      <Card>
        <Table head={["Topic", "Description", "Active", ""]}>
          {(topics ?? []).map((t) => (
            <tr key={t.id}>
              <td>{t.emoji} {t.name}</td>
              <td className="text-gray-500">{t.description}</td>
              <td>{t.active ? "Yes" : "No"}</td>
              <td>
                <form action={toggleTopic}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="active" value={String(t.active)} />
                  <button className={ghostBtn}>{t.active ? "Hide" : "Show"}</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
