import type { SupabaseClient } from "@supabase/supabase-js";

export const CHALLENGE_SELECT = "id,title,description,template_id,starts_at,ends_at,prize,sponsor:sponsors(id,name,logo_url,link_url)";

export type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  template_id: string | null;
  starts_at: string;
  ends_at: string;
  prize: string | null;
  sponsor: { id: string; name: string; logo_url: string | null; link_url: string | null } | null;
};

/** The challenge running right now, if any. */
export async function currentChallenge(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("challenges")
    .select(CHALLENGE_SELECT)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as ChallengeRow | null;
}

export function daysLeft(endsAt: string) {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

/** Is the sponsored-challenges revenue switch on? */
export async function sponsoredOn(supabase: SupabaseClient) {
  const { data } = await supabase.from("settings").select("value").eq("key", "feature_sponsored_challenges").maybeSingle();
  return data?.value === true;
}
