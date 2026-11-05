"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { shareToWhatsApp } from "@/lib/share";
import { timeAgo } from "@/lib/time";
import { ALIAS_STYLES, FRAMES } from "@/lib/premium";

export type MemeRow = {
  id: string;
  image_url: string;
  thumb_url: string | null;
  laugh_count: number;
  comment_count: number;
  created_at: string;
  template_id: string | null;
  author: { alias: string; avatar: string; avatar_frame?: string | null; alias_style?: string | null } | null;
  topic: { name: string; emoji: string | null } | null;
  challenge: { title: string } | null;
};

const REASONS = ["Targets a person", "Real name or school name", "Sexual or hateful content", "Spam or something else"];

export default function MemeCard({
  meme,
  laughed,
  dataSaver,
  loggedIn,
  detail,
}: {
  meme: MemeRow;
  laughed: boolean;
  dataSaver: boolean;
  loggedIn: boolean;
  detail?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [laughs, setLaughs] = useState(meme.laugh_count);
  const [mine, setMine] = useState(laughed);
  const [full, setFull] = useState(!dataSaver || !!detail);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");

  async function toggleLaugh() {
    if (!loggedIn) return void (location.href = "/signup");
    const next = !mine;
    setMine(next);
    setLaughs((n) => n + (next ? 1 : -1));
    const { data } = await supabase.auth.getUser();
    const uid = data.user!.id;
    const { error } = next
      ? await supabase.from("laughs").insert({ user_id: uid, meme_id: meme.id })
      : await supabase.from("laughs").delete().eq("user_id", uid).eq("meme_id", meme.id);
    if (error) {
      setMine(!next);
      setLaughs((n) => n + (next ? -1 : 1));
    }
  }

  async function share() {
    if (await shareToWhatsApp(meme)) {
      if (loggedIn) await supabase.rpc("record_share", { p_meme: meme.id });
    }
  }

  async function report(reason: string) {
    setMenu(false);
    if (!loggedIn) return void (location.href = "/signup");
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({ reporter_id: data.user!.id, meme_id: meme.id, reason });
    setNote(error?.code === "23505" ? "You already reported this." : "Thanks, we'll review it.");
  }

  const src = full ? meme.image_url : (meme.thumb_url ?? meme.image_url);

  return (
    <article className="overflow-hidden rounded-[14px] border border-lilac bg-white shadow-sm">
      <header className="relative flex items-center gap-2 p-3">
        <span className={`rounded-full text-2xl ${FRAMES[meme.author?.avatar_frame ?? ""]?.cls ?? ""}`}>{meme.author?.avatar ?? "😎"}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${ALIAS_STYLES[meme.author?.alias_style ?? ""]?.cls ?? "text-brand"}`}>{meme.author?.alias ?? "@deleted"}</p>
          <p className="truncate text-xs text-gray-500">
            {meme.challenge ? `🏆 ${meme.challenge.title}` : `${meme.topic?.emoji ?? ""} ${meme.topic?.name ?? ""}`} · {timeAgo(meme.created_at)}
          </p>
        </div>
        <button aria-label="More" className="px-2 text-xl text-gray-500" onClick={() => setMenu((m) => !m)}>
          ⋯
        </button>
        {menu && (
          <div className="absolute right-3 top-11 z-10 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
            <p className="px-3 py-1 text-xs font-semibold text-gray-500">Report this meme</p>
            {REASONS.map((r) => (
              <button key={r} onClick={() => report(r)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-lilac">
                {r}
              </button>
            ))}
          </div>
        )}
      </header>

      {detail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Meme" className="w-full" />
      ) : (
        <Link href={`/m/${meme.id}`} onClick={(e) => { if (!full) { e.preventDefault(); setFull(true); } }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Meme" loading="lazy" className="w-full" />
          {!full && <p className="bg-lilac py-1 text-center text-xs text-brand">Data saver: tap to load</p>}
        </Link>
      )}

      <div className="flex items-center gap-2 p-3">
        <button
          onClick={toggleLaugh}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mine ? "bg-accent text-brand" : "bg-lilac text-brand"}`}
        >
          😂 {laughs}
        </button>
        <Link href={`/m/${meme.id}`} className="rounded-full bg-lilac px-3 py-1.5 text-sm font-semibold text-brand">
          💬 {meme.comment_count}
        </Link>
        <button onClick={share} className="ml-auto rounded-full bg-share px-3 py-1.5 text-sm font-bold text-white">
          Share to WhatsApp
        </button>
      </div>
      {detail && meme.template_id && (
        <Link href={`/create?template=${meme.template_id}`} className="mx-3 mb-3 block rounded-full border border-brand py-2 text-center text-sm font-bold text-brand">
          Use this template
        </Link>
      )}
      {note && <p className="px-3 pb-3 text-xs text-gray-600">{note}</p>}
    </article>
  );
}
