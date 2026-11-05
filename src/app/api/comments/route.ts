import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLOCKED_MESSAGE, canPost, containsBlocked } from "@/lib/moderation";

const UUID = /^[0-9a-f-]{36}$/i;

/** Create a comment: checks bans, daily limit and the word filter. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { memeId, parentId, body } = await req.json();
  const text = typeof body === "string" ? body.trim() : "";
  if (!UUID.test(memeId) || text.length < 1 || text.length > 500 || (parentId && !UUID.test(parentId))) {
    return NextResponse.json({ error: "Bad comment." }, { status: 400 });
  }

  const admin = createAdminClient();
  const can = await canPost(admin, user.id, "comments");
  if (!can.ok) return NextResponse.json({ error: can.error }, { status: can.status });
  if (await containsBlocked(admin, [text])) return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 422 });

  const { data: meme } = await admin.from("memes").select("id").eq("id", memeId).eq("status", "visible").maybeSingle();
  if (!meme) return NextResponse.json({ error: "That meme isn't available." }, { status: 404 });

  const { error } = await admin.from("comments").insert({ meme_id: memeId, author_id: user.id, parent_id: parentId || null, body: text });
  if (error) return NextResponse.json({ error: "Couldn't post your comment." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
