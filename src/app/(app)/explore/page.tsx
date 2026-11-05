import { Suspense } from "react";
import Link from "next/link";
import Page from "@/components/Page";
import ImpressionTracker from "@/components/ImpressionTracker";
import TopicList from "./TopicList";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentChallenge, daysLeft, sponsoredOn } from "@/lib/challenges";

async function Body() {
  // Make sure finished challenges have their winners awarded (the hourly job does this too).
  await createAdminClient().rpc("finalize_challenges");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [challenge, showSponsor, { data: topics }, { data: joined }] = await Promise.all([
    currentChallenge(supabase),
    sponsoredOn(supabase),
    supabase.from("topics").select("id,name,description,emoji").eq("active", true).order("name"),
    supabase.from("topic_members").select("topic_id").eq("user_id", auth.user!.id),
  ]);
  const entries = challenge
    ? (await supabase.from("memes").select("id", { count: "exact", head: true }).eq("challenge_id", challenge.id)).count ?? 0
    : 0;
  const sponsor = showSponsor ? challenge?.sponsor : null;

  return (
    <>
      {challenge ? (
        <section className="mb-6 rounded-[14px] bg-gradient-to-br from-accent to-orange-400 p-4 text-brand shadow">
          <p className="text-xs font-bold uppercase tracking-wide">Weekly challenge</p>
          <h2 className="text-2xl font-extrabold">{challenge.title}</h2>
          <p className="mt-1 text-sm">{challenge.description}</p>
          <p className="mt-2 text-xs font-semibold">
            ⏳ {daysLeft(challenge.ends_at)} days left · 🖼️ {entries} entries
          </p>
          {challenge.prize && <p className="text-xs font-semibold">🎁 {challenge.prize}</p>}
          {sponsor && (
            <p className="mt-1 text-xs font-semibold">
              Sponsored by{" "}
              {sponsor.link_url ? (
                <a href={sponsor.link_url} target="_blank" rel="noopener noreferrer sponsored" className="underline">{sponsor.name}</a>
              ) : (
                sponsor.name
              )}
            </p>
          )}
          {sponsor && <ImpressionTracker challengeId={challenge.id} sponsorId={sponsor.id} />}
          <div className="mt-3 flex gap-2">
            <Link href={`/create?challenge=${challenge.id}`} className="flex-1 rounded-full bg-brand py-2.5 text-center text-sm font-bold text-white">
              Join challenge
            </Link>
            <Link href={`/challenge/${challenge.id}`} className="rounded-full bg-white/70 px-4 py-2.5 text-sm font-bold">
              See entries
            </Link>
          </div>
        </section>
      ) : (
        <p className="mb-6 rounded-[14px] bg-lilac p-4 text-center text-sm text-gray-600">No challenge running right now. A new one starts soon!</p>
      )}

      <h2 className="mb-2 text-lg font-bold text-brand">Topics</h2>
      <TopicList topics={topics ?? []} joined={(joined ?? []).map((j) => j.topic_id)} />
    </>
  );
}

export default function Explore() {
  return (
    <Page title="Explore">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-[14px] bg-lilac" />}>
        <Body />
      </Suspense>
    </Page>
  );
}
