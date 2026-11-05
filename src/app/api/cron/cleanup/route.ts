import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Nightly cleanup (scheduled in vercel.json). Keeps storage and the database small.
export const maxDuration = 60;

const DAY = 86_400_000;
const STALE_MEME_DAYS = 90; // visible memes nobody reacted to
const REMOVED_MEME_DAYS = 30; // memes a moderator removed
const ANALYTICS_DAYS = 180; // raw event rows
const ORPHAN_GRACE_DAYS = 2; // never touch files newer than this (uploads in flight)
const BATCH = 200;

/** "https://…/storage/v1/object/public/memes/<path>" → "<path>" */
const pathOf = (url: string | null) => (url ? url.split("/object/public/memes/")[1] ?? null : null);

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // ?dry=1 only reports what would be deleted; nothing is removed.
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = createAdminClient();
  const iso = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const report = { dryRun: dry, staleMemes: 0, removedMemes: 0, orphanFiles: 0, analyticsPruned: 0, errors: [] as string[] };

  async function dropMemes(rows: { id: string; image_url: string; thumb_url: string | null }[]) {
    if (!rows.length) return 0;
    if (dry) return rows.length;
    const files = rows.flatMap((r) => [pathOf(r.image_url), pathOf(r.thumb_url)]).filter((p): p is string => !!p);
    // Delete the rows first (cascades comments, laughs, reports), then the files.
    const { error } = await db.from("memes").delete().in("id", rows.map((r) => r.id));
    if (error) {
      report.errors.push(`delete memes: ${error.message}`);
      return 0;
    }
    if (files.length) {
      const { error: e2 } = await db.storage.from("memes").remove(files);
      if (e2) report.errors.push(`remove files: ${e2.message}`);
    }
    return rows.length;
  }

  // 1. Old memes with no laughs, comments or shares. Winners, campaign memes and tipped memes are kept.
  const [{ data: badges }, { data: camp }, { data: tipped }] = await Promise.all([
    db.from("challenge_badges").select("meme_id"),
    db.from("campaign_memes").select("meme_id"),
    db.from("ledger").select("meme_id").not("meme_id", "is", null),
  ]);
  const keep = new Set([...(badges ?? []), ...(camp ?? []), ...(tipped ?? [])].map((r) => r.meme_id as string));
  const { data: stale } = await db
    .from("memes")
    .select("id,image_url,thumb_url")
    .eq("status", "visible")
    .eq("laugh_count", 0)
    .eq("comment_count", 0)
    .eq("share_count", 0)
    .lt("created_at", iso(STALE_MEME_DAYS))
    .limit(BATCH);
  report.staleMemes = await dropMemes((stale ?? []).filter((m) => !keep.has(m.id)));

  // 2. Memes a moderator removed, after a 30 day grace period.
  const { data: removed } = await db.from("memes").select("id,image_url,thumb_url").eq("status", "removed").lt("created_at", iso(REMOVED_MEME_DAYS)).limit(BATCH);
  report.removedMemes = await dropMemes((removed ?? []).filter((m) => !keep.has(m.id)));

  // 3. Raw analytics rows older than 180 days (revenue lives in the ledger and is never touched).
  if (dry) {
    const { count } = await db.from("analytics_events").select("id", { count: "exact", head: true }).lt("created_at", iso(ANALYTICS_DAYS));
    report.analyticsPruned = count ?? 0;
  } else {
    const { count } = await db.from("analytics_events").delete({ count: "exact" }).lt("created_at", iso(ANALYTICS_DAYS));
    report.analyticsPruned = count ?? 0;
  }

  // 4. Orphan files: in storage but not in any meme (deleted accounts, failed posts). One folder per user.
  const cutoff = Date.now() - ORPHAN_GRACE_DAYS * DAY;
  const { data: folders } = await db.storage.from("memes").list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
  for (const folder of folders ?? []) {
    if (folder.id) continue; // a file at the top level, not a user folder
    const { data: files } = await db.storage.from("memes").list(folder.name, { limit: 1000 });
    const old = (files ?? []).filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff);
    if (!old.length) continue;
    const { data: mine } = await db.from("memes").select("image_url,thumb_url").eq("author_id", folder.name);
    const used = new Set((mine ?? []).flatMap((m) => [pathOf(m.image_url), pathOf(m.thumb_url)]).filter(Boolean));
    const orphans = old.map((f) => `${folder.name}/${f.name}`).filter((p) => !used.has(p));
    if (!orphans.length) continue;
    if (dry) {
      report.orphanFiles += orphans.length;
      continue;
    }
    const { error } = await db.storage.from("memes").remove(orphans);
    if (error) report.errors.push(`orphans ${folder.name}: ${error.message}`);
    else report.orphanFiles += orphans.length;
  }

  return NextResponse.json({ ok: report.errors.length === 0, ...report });
}
