import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Page from "@/components/Page";
import MemeCard, { type MemeRow } from "@/components/MemeCard";
import Comments, { type CommentRow } from "./Comments";
import { createClient } from "@/lib/supabase/server";
import { getPublicMeme } from "@/lib/public-meme";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { sandboxMode } from "@/lib/payments";
import TipButton from "@/components/TipButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await getPublicMeme(id);
  if (!m) return { title: "CampusMemes" };
  const title = `A meme by ${m.author?.alias ?? "a student"} on CampusMemes`;
  const description = "Student-life memes. No real names. Join to laugh and make your own.";
  return { title, description, openGraph: { siteName: "CampusMemes", title, description, images: [m.image_url] }, twitter: { card: "summary_large_image", title, images: [m.image_url] } };
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const { data: meme } = await supabase
    .from("memes")
    .select("id,author_id,image_url,thumb_url,laugh_count,comment_count,created_at,template_id,author:profiles!author_id(alias,avatar,avatar_frame,alias_style),topic:topics(name,emoji),challenge:challenges(title)")
    .eq("id", id)
    .maybeSingle();
  if (!meme) notFound();

  const [{ data: comments }, { data: mine }, { data: me }] = await Promise.all([
    supabase.from("comments").select("id,parent_id,body,created_at,author:profiles!author_id(alias,avatar)").eq("meme_id", id).order("created_at"),
    user ? supabase.from("laughs").select("meme_id").eq("user_id", user.id).eq("meme_id", id).maybeSingle() : { data: null },
    user ? supabase.from("profiles").select("alias").eq("id", user.id).maybeSingle() : { data: null },
  ]);

  const admin = createAdminClient();
  const tipsOn = !!user && (meme as unknown as { author_id: string | null }).author_id !== user.id && (await getSettings(admin)).tipsOn;
  const phone = tipsOn ? ((await admin.from("user_private").select("payout_msisdn").eq("user_id", user!.id).maybeSingle()).data?.payout_msisdn ?? "") : "";

  return (
    <div className="space-y-4">
      {!user && (
        <Link href="/signup" className="block rounded-[14px] bg-accent p-3 text-center text-sm font-bold text-brand">
          Join CampusMemes to laugh, comment and make your own →
        </Link>
      )}
      <MemeCard meme={meme as unknown as MemeRow} laughed={!!mine} dataSaver={false} loggedIn={!!user} detail />
      {tipsOn && <TipButton memeId={id} phone={phone} sandbox={sandboxMode()} />}
      <Comments memeId={id} comments={(comments ?? []) as unknown as CommentRow[]} loggedIn={!!user} alias={me?.alias ?? ""} />
    </div>
  );
}

export default function MemePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Page>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-lilac" />}>
        <Detail params={params} />
      </Suspense>
    </Page>
  );
}
