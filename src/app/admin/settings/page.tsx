import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Card, H1, btnCls, ghostBtn, inputCls } from "@/components/admin-ui";
import { addBlockword, removeBlockword, saveSettings } from "../actions";

const SWITCHES: [string, string][] = [
  ["feature_sponsored_challenges", "Sponsored challenges"],
  ["feature_branded_templates", "Branded templates & stickers"],
  ["feature_feed_ads", "Sponsored feed cards"],
  ["feature_premium", "Premium subscription"],
  ["feature_tips", "Creator tips"],
  ["feature_campaigns", "Meme marketing campaigns"],
];
const NUMBERS: [string, string][] = [
  ["tip_fee_percent", "Tip fee kept by CampusMemes (%)"],
  ["premium_price_ugx", "Premium price per month (UGX)"],
  ["ad_every_n_memes", "Show at most one ad every N memes"],
  ["max_posts_per_day", "Max memes per user per day"],
  ["max_comments_per_day", "Max comments per user per day"],
  ["reports_to_autohide", "Reports needed to auto-hide a post"],
];

export default async function Settings() {
  await connection();
  const { db } = await requireAdmin();
  const [{ data: settings }, { data: words }] = await Promise.all([db.from("settings").select("key,value"), db.from("blocklist").select("word").order("word")]);
  const v = new Map((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <>
      <H1>Settings</H1>
      <Card title="Revenue switches and numbers">
        <form action={saveSettings} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            {SWITCHES.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={v.get(k) === true} /> {label}</label>
            ))}
          </div>
          <div className="space-y-2">
            {NUMBERS.map(([k, label]) => (
              <label key={k} className="flex items-center justify-between gap-2">{label}<input type="number" name={k} defaultValue={String(v.get(k) ?? "")} className={`${inputCls} w-28`} /></label>
            ))}
          </div>
          <button className={`${btnCls} md:col-span-2`}>Save settings</button>
        </form>
      </Card>
      <Card title="Word & name blocklist">
        <p className="mb-2 text-xs text-gray-500">Posts and comments containing these words or phrases are blocked before they go live. One per line or comma-separated. Add slurs, abuse words and real names.</p>
        <form action={addBlockword} className="mb-3 flex gap-2">
          <textarea name="words" rows={2} className={`${inputCls} flex-1`} placeholder="word, another word" />
          <button className={btnCls}>Add</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {(words ?? []).map((w) => (
            <form key={w.word} action={removeBlockword}>
              <input type="hidden" name="word" value={w.word} />
              <button className={ghostBtn} title="Remove">{w.word} ✕</button>
            </form>
          ))}
        </div>
      </Card>
    </>
  );
}
