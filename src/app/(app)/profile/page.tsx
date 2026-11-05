import { connection } from "next/server";
import { Suspense } from "react";
import Page from "@/components/Page";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./ProfileActions";
import { isPremiumNow } from "@/lib/premium";

async function ProfileBody() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  const { count } = await supabase.from("memes").select("id", { count: "exact", head: true }).eq("author_id", auth.user.id);

  const { data: badges } = await supabase
    .from("challenge_badges")
    .select("rank,challenge:challenges(title)")
    .eq("user_id", auth.user.id)
    .order("rank");

  if (!p) {
    return (
      <a href="/signup" className="text-brand underline">
        Finish setting up your alias
      </a>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-[14px] bg-lilac p-5 text-center">
        <div className="text-5xl">{p.avatar}</div>
        <p className="mt-2 text-xl font-bold text-brand">{p.alias}</p>
        <p className="text-xs text-gray-500">
          {count ?? 0} memes · {isPremiumNow(p) ? "⭐ Premium" : "Free plan"}
        </p>
        {badges && badges.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(badges as unknown as { rank: number; challenge: { title: string } }[]).map((b, i) => (
              <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-brand">
                {["🥇", "🥈", "🥉"][b.rank - 1]} {b.challenge.title}
              </span>
            ))}
          </div>
        )}
      </div>
      <ProfileActions aliasChangedAt={p.alias_changed_at} dataSaver={p.data_saver} />
    </>
  );
}

export default function Profile() {
  return (
    <Page>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-lilac" />}>
        <ProfileBody />
      </Suspense>
    </Page>
  );
}
