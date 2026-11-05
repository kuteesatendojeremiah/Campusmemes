"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Topic = { id: string; name: string; description: string | null; emoji: string | null };

export default function TopicList({ topics, joined }: { topics: Topic[]; joined: string[] }) {
  const [supabase] = useState(() => createClient());
  const [mine, setMine] = useState(new Set(joined));

  async function toggle(id: string) {
    const on = !mine.has(id);
    setMine((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    const { data } = await supabase.auth.getUser();
    const uid = data.user!.id;
    const { error } = on
      ? await supabase.from("topic_members").insert({ user_id: uid, topic_id: id })
      : await supabase.from("topic_members").delete().eq("user_id", uid).eq("topic_id", id);
    if (error)
      setMine((s) => {
        const n = new Set(s);
        if (on) n.delete(id);
        else n.add(id);
        return n;
      });
  }

  return (
    <ul className="space-y-2">
      {topics.map((t) => (
        <li key={t.id} className="flex items-center gap-3 rounded-[14px] border border-lilac p-3">
          <span className="text-2xl">{t.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand">{t.name}</p>
            <p className="line-clamp-2 text-xs text-gray-500">{t.description}</p>
          </div>
          <button
            onClick={() => toggle(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${mine.has(t.id) ? "bg-lilac text-brand" : "bg-brand text-white"}`}
          >
            {mine.has(t.id) ? "Joined ✓" : "Join"}
          </button>
        </li>
      ))}
    </ul>
  );
}
