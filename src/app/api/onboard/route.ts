import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVATARS, normalizeEmail } from "@/lib/alias";

export async function POST(req: Request) {
  const { alias, avatar, acceptedRules } = await req.json();
  if (!acceptedRules) return NextResponse.json({ error: "Please accept the house rules." }, { status: 400 });
  if (typeof alias !== "string" || !/^@[A-Za-z0-9_]{3,24}$/.test(alias)) {
    return NextResponse.json({ error: "Invalid alias." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || (!user.phone && !user.email)) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();
  // Private identity: the phone number, or "email:<address>" for email sign-ups. Bans match on this value.
  const phone = user.phone ? (user.phone.startsWith("+") ? user.phone : `+${user.phone}`) : `email:${normalizeEmail(user.email!)}`;

  const { data: banned } = await admin.from("banned_phones").select("phone").eq("phone", phone).maybeSingle();
  if (banned) {
    await admin.auth.admin.deleteUser(user.id);
    return NextResponse.json({ error: "This account can't be used on CampusMemes." }, { status: 403 });
  }

  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  const row = { id: user.id, alias, avatar: AVATARS.includes(avatar) ? avatar : "😎", accepted_rules_at: new Date().toISOString() };
  let { error } = await admin.from("profiles").insert(row);
  if (error?.code === "23505") {
    // alias taken: add a random suffix
    ({ error } = await admin.from("profiles").insert({ ...row, alias: `${alias.slice(0, 20)}${Math.floor(Math.random() * 900 + 100)}` }));
  }
  if (error) return NextResponse.json({ error: "Could not create profile." }, { status: 500 });

  await admin.from("user_private").upsert({ user_id: user.id, phone });
  return NextResponse.json({ ok: true });
}
