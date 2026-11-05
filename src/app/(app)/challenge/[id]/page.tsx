import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Page from "@/components/Page";
import MemeCard, { type MemeRow } from "@/components/MemeCard";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_SELECT, daysLeft, sponsoredOn, type ChallengeRow } from "@/lib/challenges";

const MEME_SELECT =
  "id,image_url,thumb_url,laugh_count,comment_count,created_at,template_id,author:profiles!author_id(alias,avatar),topic:topics(name,emoji),challenge:challenges(title)";
const MEDAL = ["🥇", "🥈", "🥉"];

async function Body({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  const { id } = await params;
  const { sort = "top" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const { data } = await supabase.from("challenges").select(CHALLENGE_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as unknown as ChallengeRow;
  const showSponsor = await sponsoredOn(supabase);
  const ended = new Date(c.ends_at) < new Date();

  let q = supabase.from("memes").select(MEME_SELECT).eq("challenge_id", id).limit(30);
  q = sort === "new" ? q.order("created_at", { ascending: false }) : q.order("laugh_count", { ascending: false }).order("comment_count", { ascending: false });
  const [{ data: memes }, { data: winners }, { data: past }, { data: me }] = await Promise.all([
    q,
    supabase.from("challenge_badges").select("rank,meme_id").eq("challenge_id", id).order("rank"),
    supabase
      .from("challenge_badges")
      .select("challenge_id,meme:memes(id,image_url,thumb_url),user:profiles(alias,avatar),challenge:challenges(title)")
      .eq("rank", 1)
      .neq("challenge_id", id)
      .order("challenge_id")
      .limit(5),
    user ? supabase.from("profiles").select("data_saver").eq("id", user.id).maybeSingle() : { data: null },
  ]);
  const list = (memes ?? []) as unknown as MemeRow[];
  const rankOf = new Map((winners ?? []).map((w) => [w.meme_id, w.rank as number]));

  const { data: mine } = user && list.length
    ? await supabase.from("laughs").select("meme_id").eq("user_id", user.id).in("meme_id", list.map((m) => m.id))
    : { data: [] };
  const laughed = new Set((mine ?? []).map((l) => l.meme_id));
  const tab = (active: boolean) => `rounded-full px-4 py-1.5 text-sm font-semibold ${active ? "bg-brand text-white" : "bg-lilac text-brand"}`;

  return (
    <>
      <section className="mb-4 rounded-[14px] bg-gradient-to-br from-accent to-orange-400 p-4 text-brand">
        <h2 className="text-2xl font-extrabold">{c.title}</h2>
        <p className="mt-1 text-sm">{c.description}</p>
        <p className="mt-2 text-xs font-semibold">{ended ? "Finished" : `⏳ ${daysLeft(c.ends_at)} days left`}</p>
        {c.prize && <p className="text-xs font-semibold">🎁 {c.prize}</p>}
        {showSponsor && c.sponsor && <p className="text-xs font-semibold">Sponsored by {c.sponsor.name}</p>}
        {!ended && (
          <Link href={`/create?challenge=${c.id}`} className="mt-3 block rounded-full bg-brand py-2.5 text-center text-sm font-bold text-white">
            Join challenge
          </Link>
        )}
      </section>

      <div className="mb-4 flex gap-2">
        <Link href={`/challenge/${id}?sort=top`} className={tab(sort !== "new")}>Top</Link>
        <Link href={`/challenge/${id}?sort=new`} className={tab(sort === "new")}>New</Link>
      </div>

      <div className="space-y-4">
        {list.map((m) => (
          <div key={m.id} className="relative">
            {rankOf.has(m.id) && (
              <span className="absolute right-3 top-2 z-10 rounded-full bg-accent px-2 py-0.5 text-sm font-bold">{MEDAL[(rankOf.get(m.id) ?? 1) - 1]} Top {rankOf.get(m.id)}</span>
            )}
            <MemeCard meme={m} laughed={laughed.has(m.id)} dataSaver={!!me?.data_saver} loggedIn={!!user} />
          </div>
        ))}
        {list.length === 0 && <p className="rounded-[14px] bg-lilac p-6 text-center text-sm text-gray-600">No entries yet. Be the first!</p>}
      </div>

      {(past ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-bold text-brand">Past winners</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(past as unknown as { challenge_id: string; meme: { id: string; image_url: string; thumb_url: string | null }; user: { alias: string; avatar: string }; challenge: { title: string } }[]).map((w) => (
              <Link key={w.challenge_id} href={`/m/${w.meme.id}`} className="w-36 shrink-0 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.meme.thumb_url ?? w.meme.image_url} alt="Winning meme" loading="lazy" className="h-36 w-36 rounded-xl object-cover" />
                <p className="mt-1 truncate text-xs font-bold text-brand">🥇 {w.user.alias}</p>
                <p className="truncate text-[11px] text-gray-500">{w.challenge.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function ChallengePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  return (
    <Page>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-[14px] bg-lilac" />}>
        <Body params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}
