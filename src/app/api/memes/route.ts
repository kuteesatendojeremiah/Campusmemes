import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPremiumNow } from "@/lib/premium";
import { BLOCKED_MESSAGE, canPost, containsBlocked } from "@/lib/moderation";

const UUID = /^[0-9a-f-]{36}$/i;

/** Create a meme: checks bans, daily limit and the word filter, then saves it. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { imagePath, thumbPath, topicId, challengeId, templateId, texts } = await req.json();
  const admin = createAdminClient();

  // Both files must be inside this user's own storage folder.
  const mine = (p: unknown) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  if (!mine(imagePath) || !mine(thumbPath)) return NextResponse.json({ error: "Bad upload." }, { status: 400 });
  const cleanup = () => admin.storage.from("memes").remove([imagePath, thumbPath]);

  const reject = async (status: number, error: string) => {
    await cleanup();
    return NextResponse.json({ error }, { status });
  };

  const can = await canPost(admin, user.id, "memes");
  if (!can.ok) return reject(can.status, can.error);

  if (Array.isArray(texts) && (await containsBlocked(admin, texts.map(String)))) return reject(422, BLOCKED_MESSAGE);

  if (templateId && UUID.test(templateId)) {
    const { data: tpl } = await admin.from("templates").select("premium_only").eq("id", templateId).maybeSingle();
    if (tpl?.premium_only) {
      const { data: prof } = await admin.from("profiles").select("is_premium,premium_until").eq("id", user.id).maybeSingle();
      if (!isPremiumNow(prof)) return reject(403, "That template is for Premium members.");
    }
  }

  if (!!topicId === !!challengeId) return reject(400, "Choose a topic or a challenge.");
  if (topicId && !UUID.test(topicId)) return reject(400, "Bad topic.");
  if (challengeId) {
    const now = new Date().toISOString();
    const { data: ch } = await admin.from("challenges").select("id").eq("id", challengeId).lte("starts_at", now).gte("ends_at", now).maybeSingle();
    if (!ch) return reject(400, "That challenge has ended.");
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/memes/`;
  const { data: meme, error } = await admin
    .from("memes")
    .insert({
      author_id: user.id,
      topic_id: topicId || null,
      challenge_id: challengeId || null,
      template_id: templateId && UUID.test(templateId) ? templateId : null,
      image_url: base + imagePath,
      thumb_url: base + thumbPath,
    })
    .select("id")
    .single();
  if (error) return reject(500, "Couldn't post your meme.");
  return NextResponse.json({ id: meme.id });
}
