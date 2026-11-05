import { Suspense } from "react";
import Page from "@/components/Page";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { isPremiumNow } from "@/lib/premium";
import { sandboxMode } from "@/lib/payments";
import PremiumClient from "./PremiumClient";

async function Body() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const db = createAdminClient();
  const [s, { data: p }, { data: priv }] = await Promise.all([
    getSettings(db),
    db.from("profiles").select("is_premium,premium_until,avatar_frame,alias_style").eq("id", auth.user.id).maybeSingle(),
    db.from("user_private").select("payout_msisdn").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  const active = isPremiumNow(p);

  return (
    <>
      <div className="mb-4 rounded-[14px] bg-gradient-to-br from-accent to-orange-300 p-5 text-brand">
        <p className="text-xs font-bold uppercase tracking-wide">CampusMemes Premium</p>
        <p className="text-3xl font-extrabold">
          UGX {s.premiumPrice.toLocaleString()}
          <span className="text-base font-semibold"> / month</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm font-semibold">
          <li>🚫 No sponsored cards in your feed</li>
          <li>🖼️ Extra meme templates and fonts</li>
          <li>✨ Avatar frames and alias styles</li>
        </ul>
        <p className="mt-3 text-xs">Premium never gives an advantage in challenges or trending.</p>
      </div>
      {!s.premiumOn && !active ? (
        <p className="rounded-[14px] bg-lilac p-4 text-center text-sm text-gray-600">Premium opens soon. Check back later.</p>
      ) : (
        <PremiumClient
          active={active}
          until={p?.premium_until ?? null}
          frame={p?.avatar_frame ?? ""}
          aliasStyle={p?.alias_style ?? ""}
          phone={priv?.payout_msisdn ?? ""}
          sandbox={sandboxMode()}
          canBuy={s.premiumOn}
        />
      )}
    </>
  );
}

export default function PremiumPage() {
  return (
    <Page title="Premium">
      <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-lilac" />}>
        <Body />
      </Suspense>
    </Page>
  );
}
