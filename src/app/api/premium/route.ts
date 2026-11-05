import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/alias";
import { collect } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

/** Buy 30 days of Premium by Mobile Money. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const uid = auth.user.id;
  const db = createAdminClient();

  const s = await getSettings(db);
  if (!s.premiumOn) return NextResponse.json({ error: "Premium isn't open yet." }, { status: 403 });

  const { msisdn: raw } = await req.json();
  const msisdn = normalizePhone(String(raw ?? ""));
  if (!msisdn) return NextResponse.json({ error: "Enter a valid Mobile Money number." }, { status: 400 });

  const paid = await collect(msisdn, s.premiumPrice);
  if (!paid.ok) {
    await db.from("ledger").insert({ kind: "premium", user_id: uid, amount: s.premiumPrice, provider: "failed", status: "failed" });
    return NextResponse.json({ error: paid.error }, { status: 402 });
  }

  await db.from("ledger").insert({ kind: "premium", user_id: uid, amount: s.premiumPrice, provider: paid.network, provider_ref: paid.ref, status: "completed" });
  const { data: until } = await db.rpc("grant_premium", { p_user: uid, p_days: 30 });
  await db.from("analytics_events").insert({ event: "premium_purchase", user_id: uid });
  return NextResponse.json({ until });
}
