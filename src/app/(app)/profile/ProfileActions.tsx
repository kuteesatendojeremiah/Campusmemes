"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { randomAlias, randomAvatar } from "@/lib/alias";

const DAY = 86_400_000;

export default function ProfileActions({ aliasChangedAt, dataSaver }: { aliasChangedAt: string | null; dataSaver: boolean }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [saver, setSaver] = useState(dataSaver);
  const [msg, setMsg] = useState("");

  const daysLeft = aliasChangedAt ? Math.ceil((new Date(aliasChangedAt).getTime() + 30 * DAY - Date.now()) / DAY) : 0;

  async function shuffle() {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ alias: randomAlias(), avatar: randomAvatar(), alias_changed_at: new Date().toISOString() })
      .eq("id", data.user!.id);
    if (error) {
      // alias collision (unique) — ask to try again
      setMsg("That alias was taken, try again.");
      return;
    }
    router.refresh();
  }

  async function toggleSaver() {
    const next = !saver;
    setSaver(next);
    const { data } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ data_saver: next }).eq("id", data.user!.id);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/signup");
  }

  async function del() {
    if (!confirm("Delete your account and all your memes? This can't be undone.")) return;
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) router.replace("/signup");
    else setMsg("Could not delete account. Try again.");
  }

  const row = "flex w-full items-center justify-between border-b border-lilac py-3 text-left text-sm";

  return (
    <div>
      <button className={row} onClick={shuffle} disabled={daysLeft > 0}>
        <span>🔀 Shuffle alias &amp; avatar</span>
        <span className="text-xs text-gray-500">{daysLeft > 0 ? `again in ${daysLeft} days` : "once every 30 days"}</span>
      </button>
      <button className={row} onClick={toggleSaver}>
        <span>📶 Data saver</span>
        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${saver ? "bg-share text-white" : "bg-gray-200"}`}>{saver ? "On" : "Off"}</span>
      </button>
      <a className={row} href="/premium">⭐ Premium</a>
      <a className={row} href="/earnings">💸 Tips &amp; earnings</a>
      <a className={row} href="/rules">📜 House rules</a>
      <a className={row} href="/privacy">🔒 Privacy &amp; terms</a>
      <button className={row} onClick={logout}>Log out</button>
      <button className={`${row} text-red-600`} onClick={del}>Delete account</button>
      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
    </div>
  );
}
