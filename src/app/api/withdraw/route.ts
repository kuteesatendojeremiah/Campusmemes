import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/alias";
import { disburse } from "@/lib/payments";

const MIN_WITHDRAWAL = 2000;

/** Creators withdraw their tip balance to their own Mobile Money number. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const uid = auth.user.id;
  const db = createAdminClient();

  const { amount: rawAmount, msisdn: raw } = await req.json();
  const amount = Number(rawAmount);
  const msisdn = normalizePhone(String(raw ?? ""));
  if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "Enter an amount." }, { status: 400 });
  if (!msisdn) return NextResponse.json({ error: "Enter a valid Mobile Money number." }, { status: 400 });

  const { data: id, error } = await db.rpc("start_withdrawal", { p_user: uid, p_amount: amount, p_msisdn: msisdn, p_min: MIN_WITHDRAWAL });
  if (error) {
    const msg = error.message.includes("below_minimum")
      ? `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}.`
      : error.message.includes("insufficient")
        ? "That's more than your balance."
        : "Couldn't start the withdrawal.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sent = await disburse(msisdn, amount);
  if (!sent.ok) {
    // A failed row no longer counts against the balance, so the money is back.
    await db.from("ledger").update({ status: "failed" }).eq("id", id);
    return NextResponse.json({ error: sent.error }, { status: 402 });
  }
  await db.from("ledger").update({ status: "completed", provider: sent.network, provider_ref: sent.ref }).eq("id", id);
  await db.from("user_private").update({ payout_msisdn: msisdn }).eq("user_id", uid);
  return NextResponse.json({ ok: true });
}
