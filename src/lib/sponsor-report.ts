import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SponsorReport = {
  sponsor: string;
  impressions: number;
  taps: number;
  challengeEntries: number;
  memesFromTemplates: number;
  laughs: number;
  shares: number;
};

/** Totals per sponsor. No personal data about users is included. */
export async function sponsorReports(db: SupabaseClient): Promise<SponsorReport[]> {
  const [{ data: sponsors }, { data: events }, { data: challenges }, { data: templates }, { data: memes }] = await Promise.all([
    db.from("sponsors").select("id,name").order("name"),
    db.from("analytics_events").select("event,sponsor_id").in("event", ["ad_impression", "ad_tap"]).not("sponsor_id", "is", null),
    db.from("challenges").select("id,sponsor_id").not("sponsor_id", "is", null),
    db.from("templates").select("id,sponsor_id").not("sponsor_id", "is", null),
    db.from("memes").select("challenge_id,template_id,laugh_count,share_count").or("challenge_id.not.is.null,template_id.not.is.null"),
  ]);

  return (sponsors ?? []).map((s) => {
    const chIds = new Set((challenges ?? []).filter((c) => c.sponsor_id === s.id).map((c) => c.id));
    const tplIds = new Set((templates ?? []).filter((t) => t.sponsor_id === s.id).map((t) => t.id));
    const related = (memes ?? []).filter((m) => chIds.has(m.challenge_id) || tplIds.has(m.template_id));
    return {
      sponsor: s.name,
      impressions: (events ?? []).filter((e) => e.sponsor_id === s.id && e.event === "ad_impression").length,
      taps: (events ?? []).filter((e) => e.sponsor_id === s.id && e.event === "ad_tap").length,
      challengeEntries: (memes ?? []).filter((m) => chIds.has(m.challenge_id)).length,
      memesFromTemplates: (memes ?? []).filter((m) => tplIds.has(m.template_id)).length,
      laughs: related.reduce((n, m) => n + m.laugh_count, 0),
      shares: related.reduce((n, m) => n + m.share_count, 0),
    };
  });
}
