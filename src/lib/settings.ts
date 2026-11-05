import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Read all admin switches and numbers as a plain object. */
export async function getSettings(db: SupabaseClient) {
  const { data } = await db.from("settings").select("key,value");
  const m = new Map((data ?? []).map((s) => [s.key as string, s.value as unknown]));
  const num = (k: string, d: number) => {
    const n = Number(m.get(k));
    return Number.isFinite(n) ? n : d;
  };
  return {
    premiumOn: m.get("feature_premium") === true,
    tipsOn: m.get("feature_tips") === true,
    adsOn: m.get("feature_feed_ads") === true,
    brandedOn: m.get("feature_branded_templates") === true,
    campaignsOn: m.get("feature_campaigns") === true,
    tipFeePercent: num("tip_fee_percent", 10),
    premiumPrice: num("premium_price_ugx", 3000),
    adEvery: Math.max(3, num("ad_every_n_memes", 10)),
  };
}
