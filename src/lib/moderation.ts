import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lowercase, strip accents, undo common letter swaps (@ → a, 0 → o), squash long repeats. */
export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if any text contains a blocked word or phrase (whole words only). */
export async function containsBlocked(admin: SupabaseClient, texts: string[]) {
  const { data } = await admin.from("blocklist").select("word");
  const blocked = (data ?? []).map((r) => normalize(r.word)).filter(Boolean);
  const haystack = ` ${normalize(texts.join(" \n "))} `;
  return blocked.some((w) => haystack.includes(` ${w} `));
}

export async function setting(admin: SupabaseClient, key: string, fallback: number) {
  const { data } = await admin.from("settings").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}

type Check = { ok: true } | { ok: false; status: number; error: string };

/** Can this user post right now? Checks ban/suspension and the daily limit. */
export async function canPost(admin: SupabaseClient, userId: string, kind: "memes" | "comments"): Promise<Check> {
  const { data: p } = await admin.from("profiles").select("status,suspended_until").eq("id", userId).maybeSingle();
  if (!p) return { ok: false, status: 403, error: "Finish setting up your alias first." };
  if (p.status === "banned") return { ok: false, status: 403, error: "Your account has been banned for breaking the house rules." };
  if (p.status === "suspended" && (!p.suspended_until || new Date(p.suspended_until) > new Date())) {
    return { ok: false, status: 403, error: "Your account is suspended for now." };
  }
  const limit = await setting(admin, kind === "memes" ? "max_posts_per_day" : "max_comments_per_day", kind === "memes" ? 20 : 100);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const col = "author_id";
  const { count } = await admin.from(kind).select("id", { count: "exact", head: true }).eq(col, userId).gte("created_at", since);
  if ((count ?? 0) >= limit) {
    return { ok: false, status: 429, error: kind === "memes" ? `You've reached today's limit of ${limit} memes. Come back tomorrow!` : `You've reached today's limit of ${limit} comments.` };
  }
  return { ok: true };
}

export const BLOCKED_MESSAGE = "Your post has words or names that aren't allowed on CampusMemes. Laugh at situations, not people.";
