import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import Page from "@/components/Page";
import MemeCard, { type MemeRow } from "@/components/MemeCard";
import AdCard, { type AdRow } from "@/components/AdCard";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { isPremiumNow } from "@/lib/premium";

const SELECT =
  "id,image_url,thumb_url,laugh_count,comment_count,created_at,template_id,author:profiles!author_id(alias,avatar,avatar_frame,alias_style),topic:topics(name,emoji),challenge:challenges(title)";

async function Feed({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await connection();
  const { tab = "trending" } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const [{ data: joined }, { data: allTopics }, { data: me }] = await Promise.all([
    user ? supabase.from("topic_members").select("topic:topics(id,slug,name,emoji)").eq("user_id", user.id) : { data: [] },
    supabase.from("topics").select("slug,name,emoji").eq("active", true).order("name"),
    user ? supabase.from("profiles").select("data_saver,is_premium,premium_until").eq("id", user.id).maybeSingle() : { data: null },
  ]);
  const chips: { slug: string; name: string; emoji: string | null }[] = joined?.length ? (joined as unknown as { topic: { id: string; slug: string; name: string; emoji: string | null } }[]).map((j) => j.topic) : (allTopics ?? []);

  let q = supabase.from("memes").select(SELECT).limit(30);
  let tabTopicId: string | null = null;
  if (tab.startsWith("t:")) {
    const { data: t } = await supabase.from("topics").select("id").eq("slug", tab.slice(2)).maybeSingle();
    tabTopicId = t?.id ?? null;
    q = q.eq("topic_id", t?.id ?? "00000000-0000-0000-0000-000000000000").order("created_at", { ascending: false });
  } else if (tab === "new") {
    q = q.order("created_at", { ascending: false });
  } else {
    q = q.order("trending_score", { ascending: false });
  }
  const { data: memes } = await q;
  const list = (memes ?? []) as unknown as MemeRow[];

  const { data: my } =
    user && list.length
      ? await supabase.from("laughs").select("meme_id").eq("user_id", user.id).in("meme_id", list.map((m) => m.id))
      : { data: [] };
  const laughed = new Set((my ?? []).map((l: { meme_id: string }) => l.meme_id));

  // Sponsored cards: off for Premium users, at most one per N memes, topic-targeted when set.
  const settings = await getSettings(supabase);
  let ads: AdRow[] = [];
  if (settings.adsOn && !isPremiumNow(me)) {
    const { data: adRows } = await supabase
      .from("feed_ads")
      .select("id,sponsor_id,title,body,image_url,link_url,topic_ids,sponsor:sponsors(name)")
      .eq("active", true)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString());
    const mine = new Set(tabTopicId ? [tabTopicId] : (joined ?? []).map((j) => (j as unknown as { topic: { id: string } }).topic.id));
    ads = ((adRows ?? []) as unknown as (AdRow & { topic_ids: string[] })[]).filter(
      (a) => a.topic_ids.length === 0 || a.topic_ids.some((t) => mine.has(t)),
    );
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${active ? "bg-brand text-white" : "bg-lilac text-brand"}`;

  // Last challenge's top 3, featured on Home for a week after it ends.
  const { data: featuredRaw } = await supabase
    .from("challenge_badges")
    .select("rank,meme:memes(id,image_url,thumb_url),user:profiles(alias),challenge:challenges!inner(title,featured_until)")
    .gt("challenge.featured_until", new Date().toISOString())
    .order("rank");
  const featured = (featuredRaw ?? []) as unknown as {
    rank: number;
    meme: { id: string; image_url: string; thumb_url: string | null };
    user: { alias: string };
    challenge: { title: string };
  }[];

  return (
    <>
      {featured.length > 0 && tab === "trending" && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-brand">🏆 {featured[0].challenge.title}: this week&apos;s winners</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {featured.map((w) => (
              <Link key={w.meme.id} href={`/m/${w.meme.id}`} className="relative w-32 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.meme.thumb_url ?? w.meme.image_url} alt="Winning meme" loading="lazy" className="h-32 w-32 rounded-xl object-cover" />
                <span className="absolute left-1 top-1 rounded-full bg-accent px-2 text-sm">{["🥇", "🥈", "🥉"][w.rank - 1]}</span>
                <p className="truncate text-xs font-semibold text-brand">{w.user.alias}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/?tab=trending" className={chip(tab === "trending")}>🔥 Trending</Link>
        <Link href="/?tab=new" className={chip(tab === "new")}>New</Link>
        {chips.map((t) => (
          <Link key={t.slug} href={`/?tab=t:${t.slug}`} className={chip(tab === `t:${t.slug}`)}>
            {t.emoji} {t.name}
          </Link>
        ))}
      </div>
      <div className="space-y-4">
        {list.map((m, i) => (
          <div key={m.id} className="space-y-4">
            <MemeCard meme={m} laughed={laughed.has(m.id)} dataSaver={!!me?.data_saver} loggedIn={!!user} />
            {ads.length > 0 && (i + 1) % settings.adEvery === 0 && i < list.length - 1 && (
              <AdCard ad={ads[((i + 1) / settings.adEvery - 1) % ads.length]} />
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="rounded-[14px] bg-lilac p-6 text-center text-sm text-gray-600">
            No memes here yet. Be the first!
            <Link href="/create" className="mt-3 block font-bold text-brand underline">Make a meme</Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Page>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-lilac" />}>
        <Feed searchParams={searchParams as Promise<{ tab?: string }>} />
      </Suspense>
    </Page>
  );
}
