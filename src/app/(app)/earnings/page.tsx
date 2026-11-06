import { connection } from "next/server";
import { Suspense } from "react";
import Page from "@/components/Page";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { sandboxMode } from "@/lib/payments";
import { timeAgo } from "@/lib/time";
import EarningsClient from "./EarningsClient";

async function Body() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const uid = auth.user.id;
  const db = createAdminClient();
  if (!(await getSettings(db)).tipsOn) {
    return <p className="rounded-[14px] bg-lilac p-4 text-center text-sm text-gray-600">Tips &amp; earnings open soon. Check back later.</p>;
  }
  const [s, balance, tips, withdrawals, { data: priv }] = await Promise.all([
    getSettings(db),
    db.rpc("creator_balance", { p_user: uid }),
    // Tips received show the amount only, never who tipped.
    db.from("ledger").select("id,kind,amount,status,created_at").eq("creator_id", uid).eq("kind", "tip").eq("status", "completed").order("created_at", { ascending: false }).limit(50),
    db.from("ledger").select("id,kind,amount,status,created_at").eq("user_id", uid).eq("kind", "withdrawal").neq("status", "failed").order("created_at", { ascending: false }).limit(50),
    db.from("user_private").select("payout_msisdn").eq("user_id", uid).maybeSingle(),
  ]);

  const history = [...(tips.data ?? []), ...(withdrawals.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const bal = Number(balance.data ?? 0);

  return (
    <>
      <div className="mb-4 rounded-[14px] bg-lilac p-5 text-center">
        <p className="text-xs font-semibold text-gray-500">Your tip balance</p>
        <p className="text-3xl font-extrabold text-brand">UGX {bal.toLocaleString()}</p>
        <p className="text-xs text-gray-500">CampusMemes keeps {s.tipFeePercent}% of each tip.</p>
      </div>
      <EarningsClient balance={bal} phone={priv?.payout_msisdn ?? ""} sandbox={sandboxMode()} />
      <h3 className="mb-2 mt-5 text-sm font-bold text-brand">History</h3>
      <ul className="divide-y divide-lilac">
        {history.map((r) => (
          <li key={r.id} className="flex justify-between py-2 text-sm">
            <span>{r.kind === "tip" ? "💸 Tip received" : `🏦 Withdrawal${r.status === "pending" ? " (processing)" : ""}`}</span>
            <span className="text-right">
              <b>
                {r.kind === "tip" ? "+" : "−"}
                {Number(r.amount).toLocaleString()}
              </b>
              <span className="block text-xs text-gray-400">{timeAgo(r.created_at)}</span>
            </span>
          </li>
        ))}
        {history.length === 0 && <li className="py-4 text-center text-sm text-gray-500">No tips yet. Post great memes!</li>}
      </ul>
    </>
  );
}

export default function Earnings() {
  return (
    <Page title="Tips & earnings">
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-lilac" />}>
        <Body />
      </Suspense>
    </Page>
  );
}
