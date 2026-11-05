import { Suspense } from "react";
import Link from "next/link";
import Page from "@/components/Page";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";

const TEXT: Record<string, string> = {
  laugh: "😂 Someone laughed at your meme",
  comment: "💬 Someone commented on your meme",
  challenge_result: "🏆 Challenge results are in",
  moderation: "⚠️ A moderation notice",
  campaign: "📣 You've been invited to a campaign",
  tip: "💸 Someone tipped your meme",
};

async function List() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("notifications").select("id,kind,data,created_at").order("created_at", { ascending: false }).limit(50);
  if (!data?.length) return <p className="rounded-[14px] bg-lilac p-6 text-center text-sm text-gray-600">Nothing yet. Post a meme and the laughs will show up here.</p>;
  return (
    <ul className="divide-y divide-lilac">
      {data.map((n) => (
        <li key={n.id}>
          <Link href={n.kind === "campaign" && n.data?.campaign_id ? `/campaign/${n.data.campaign_id}` : n.data?.meme_id ? `/m/${n.data.meme_id}` : "#"} className="flex justify-between py-3 text-sm">
            <span>{TEXT[n.kind] ?? n.kind}{n.kind === "tip" && n.data?.amount ? ` (UGX ${Number(n.data.amount).toLocaleString()})` : ""}</span>
            <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Alerts() {
  return (
    <Page title="Alerts">
      <Suspense fallback={<div className="h-32 animate-pulse rounded-[14px] bg-lilac" />}>
        <List />
      </Suspense>
    </Page>
  );
}
