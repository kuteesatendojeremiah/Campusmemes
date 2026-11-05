import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/alias";
import { collect } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

const TIP_MIN = 500;
const TIP_MAX = 50_000;

/** Tip a meme's creator by Mobile Money. The creator never learns who tipped. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const uid = auth.user.id;
  const db = createAdminClient();

  const s = await getSettings(db);
  if (!s.tipsOn) return NextResponse.json({ error: "Tips aren't open yet." }, { status: 403 });

  const { memeId, amount: rawAmount, msisdn: raw } = await req.json();
  const amount = Number(rawAmount);
  if (!Number.isInteger(amount) || amount < TIP_MIN || amount > TIP_MAX) {
    return NextResponse.json({ error: `Tip between UGX ${TIP_MIN.toLocaleString()} and ${TIP_MAX.toLocaleString()}.` }, { status: 400 });
  }
  const msisdn = normalizePhone(String(raw ?? ""));
  if (!msisdn) return NextResponse.json({ error: "Enter a valid Mobile Money number." }, { status: 400 });

  const { data: meme } = await db.from("memes").select("id,author_id,status").eq("id", String(memeId)).maybeSingle();
  if (!meme || meme.status !== "visible" || !meme.author_id) return NextResponse.json({ error: "Meme not found." }, { status: 404 });
  if (meme.author_id === uid) return NextResponse.json({ error: "You can't tip yourself." }, { status: 400 });

  const paid = await collect(msisdn, amount);
  if (!paid.ok) return NextResponse.json({ error: paid.error }, { status: 402 });

  const fee = Math.round((amount * s.tipFeePercent) / 100);
  await db.from("ledger").insert([
    { kind: "tip", user_id: uid, meme_id: meme.id, creator_id: meme.author_id, amount, provider: paid.network, provider_ref: paid.ref, status: "completed" },
    { kind: "platform_fee", meme_id: meme.id, creator_id: meme.author_id, amount: fee, status: "completed" },
  ]);
  await db.from("analytics_events").insert({ event: "tip", user_id: uid, meme_id: meme.id });
  await db.from("notifications").insert({ user_id: meme.author_id, kind: "tip", data: { meme_id: meme.id, amount: amount - fee } });
  return NextResponse.json({ ok: true });
}
