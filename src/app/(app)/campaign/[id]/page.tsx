import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Page from "@/components/Page";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CampaignAnswer from "./CampaignAnswer";

async function Body({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  // Row Level Security: only returns a row if this user was invited.
  const { data: inv } = await supabase.from("campaign_creators").select("status,payout").eq("campaign_id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!inv) notFound();
  const { data: c } = await createAdminClient().from("campaigns").select("brand,brief,starts_at,ends_at").eq("id", id).maybeSingle();
  if (!c) notFound();

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] bg-lilac p-5">
        <p className="text-xs font-bold uppercase text-gray-500">Campaign invitation</p>
        <h2 className="text-2xl font-extrabold text-brand">{c.brand}</h2>
        {c.brief && <p className="mt-2 whitespace-pre-line text-sm">{c.brief}</p>}
        {c.ends_at && <p className="mt-2 text-xs text-gray-500">Runs until {new Date(c.ends_at).toLocaleDateString()}</p>}
        <p className="mt-2 text-sm font-bold text-brand">Payout: UGX {Number(inv.payout).toLocaleString()}</p>
      </div>
      <CampaignAnswer campaignId={id} status={inv.status} />
      {inv.status === "accepted" && (
        <Link href="/create" className="block rounded-full border border-brand py-3 text-center font-bold text-brand">
          Make your campaign meme
        </Link>
      )}
      <p className="text-xs text-gray-500">Your identity stays anonymous. The brand only ever sees your alias.</p>
    </div>
  );
}

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Page>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-lilac" />}>
        <Body params={params} />
      </Suspense>
    </Page>
  );
}
