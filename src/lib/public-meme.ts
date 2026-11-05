import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/** Public (no login) read of one meme, cached briefly. Used for link previews. */
export async function getPublicMeme(id: string) {
  "use cache";
  cacheLife("minutes");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.from("memes").select("id,image_url,author:profiles!author_id(alias)").eq("id", id).maybeSingle();
  return data as unknown as { id: string; image_url: string; author: { alias: string } | null } | null;
}
