import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALIAS_STYLES, FRAMES, isPremiumNow } from "@/lib/premium";

/** Premium users pick an avatar frame and alias style. Both are cosmetic only. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = createAdminClient();

  const { data: p } = await db.from("profiles").select("is_premium,premium_until").eq("id", auth.user.id).maybeSingle();
  if (!isPremiumNow(p)) return NextResponse.json({ error: "Premium only." }, { status: 403 });

  const { frame, aliasStyle } = await req.json();
  const f = frame && frame in FRAMES ? frame : null;
  const a = aliasStyle && aliasStyle in ALIAS_STYLES ? aliasStyle : null;
  await db.from("profiles").update({ avatar_frame: f, alias_style: a }).eq("id", auth.user.id);
  return NextResponse.json({ ok: true });
}
