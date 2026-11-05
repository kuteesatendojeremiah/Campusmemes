"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, logAction, BLOCKED_SPONSOR_WORDS } from "@/lib/admin";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => s(f, k) || null;
const slug = (n: string) => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dt = (f: FormData, k: string) => (s(f, k) ? new Date(s(f, k)).toISOString() : null);

async function upload(db: Awaited<ReturnType<typeof requireAdmin>>["db"], file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await db.storage.from("assets").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error("Upload failed");
  return db.storage.from("assets").getPublicUrl(path).data.publicUrl;
}

// ───────── moderation ─────────
export async function moderate(f: FormData) {
  const { db, adminId } = await requireAdmin();
  const kind = s(f, "kind") as "meme" | "comment";
  const id = s(f, "id");
  const decision = s(f, "decision") as "keep" | "remove" | "warn" | "ban";
  const table = kind === "meme" ? "memes" : "comments";
  const { data: item } = await db.from(table).select("author_id").eq("id", id).maybeSingle();
  if (!item) return;

  const reportCol = kind === "meme" ? "meme_id" : "comment_id";
  if (decision === "keep") {
    await db.from(table).update({ status: "visible" }).eq("id", id);
    await db.from("reports").update({ status: "kept" }).eq(reportCol, id);
  } else {
    await db.from(table).update({ status: "removed" }).eq("id", id);
    await db.from("reports").update({ status: "removed" }).eq(reportCol, id);
    await db.from("notifications").insert({
      user_id: item.author_id,
      kind: "moderation",
      data: { note: decision === "remove" ? `Your ${kind} was removed for breaking the house rules.` : decision === "warn" ? `Your ${kind} was removed. Warning: further breaks can get you banned.` : `Your ${kind} was removed and your account banned.` },
    });
  }
  if (decision === "ban") await banUser(db, item.author_id);
  await logAction(db, adminId, decision, { target_user: item.author_id, [kind === "meme" ? "target_meme" : "target_comment"]: id });
  revalidatePath("/admin/moderation");
}

async function banUser(db: Awaited<ReturnType<typeof requireAdmin>>["db"], userId: string, reason = "Banned by admin") {
  await db.from("profiles").update({ status: "banned" }).eq("id", userId);
  const { data: priv } = await db.from("user_private").select("phone").eq("user_id", userId).maybeSingle();
  if (priv?.phone) await db.from("banned_phones").upsert({ phone: priv.phone, reason });
}

// ───────── users ─────────
export async function userAction(f: FormData) {
  const { db, adminId } = await requireAdmin();
  const id = s(f, "id");
  const action = s(f, "action") as "warn" | "suspend" | "ban" | "unban";
  if (action === "warn") {
    await db.from("notifications").insert({ user_id: id, kind: "moderation", data: { note: "Warning: please follow the house rules." } });
  } else if (action === "suspend") {
    await db.from("profiles").update({ status: "suspended", suspended_until: new Date(Date.now() + 7 * 86_400_000).toISOString() }).eq("id", id);
  } else if (action === "ban") {
    await banUser(db, id);
  } else if (action === "unban") {
    await db.from("profiles").update({ status: "active", suspended_until: null }).eq("id", id);
    const { data: priv } = await db.from("user_private").select("phone").eq("user_id", id).maybeSingle();
    if (priv?.phone) await db.from("banned_phones").delete().eq("phone", priv.phone);
  }
  await logAction(db, adminId, action, { target_user: id, note: opt(f, "note") ?? undefined });
  revalidatePath("/admin/users");
}

// ───────── topics ─────────
export async function addTopic(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("topics").insert({ name: s(f, "name"), slug: slug(s(f, "name")), description: opt(f, "description"), emoji: opt(f, "emoji") });
  revalidatePath("/admin/topics");
}
export async function toggleTopic(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("topics").update({ active: s(f, "active") !== "true" }).eq("id", s(f, "id"));
  revalidatePath("/admin/topics");
}

// ───────── challenges ─────────
export async function addChallenge(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("challenges").insert({
    title: s(f, "title"),
    description: opt(f, "description"),
    template_id: opt(f, "template_id"),
    sponsor_id: opt(f, "sponsor_id"),
    prize: opt(f, "prize"),
    amount_paid: s(f, "amount_paid") ? Number(s(f, "amount_paid")) : null,
    starts_at: dt(f, "starts_at"),
    ends_at: dt(f, "ends_at"),
  });
  revalidatePath("/admin/challenges");
}

// ───────── templates & stickers ─────────
export async function addTemplate(f: FormData) {
  const { db } = await requireAdmin();
  const image = (await upload(db, f.get("file"))) ?? opt(f, "url");
  if (!image) return;
  await db.from("templates").insert({
    name: s(f, "name"),
    image_url: image,
    sponsor_id: opt(f, "sponsor_id"),
    premium_only: f.get("premium_only") === "on",
    sponsored_from: dt(f, "from"),
    sponsored_until: dt(f, "until"),
  });
  revalidatePath("/admin/templates");
}
export async function toggleTemplate(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("templates").update({ active: s(f, "active") !== "true" }).eq("id", s(f, "id"));
  revalidatePath("/admin/templates");
}
export async function addPack(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("sticker_packs").insert({
    name: s(f, "name"),
    sponsor_id: opt(f, "sponsor_id"),
    premium_only: f.get("premium_only") === "on",
    sponsored_from: dt(f, "from"),
    sponsored_until: dt(f, "until"),
  });
  revalidatePath("/admin/templates");
}
export async function addSticker(f: FormData) {
  const { db } = await requireAdmin();
  const image = await upload(db, f.get("file"));
  if (image) await db.from("stickers").insert({ pack_id: s(f, "pack_id"), image_url: image });
  revalidatePath("/admin/templates");
}

// ───────── sponsors ─────────
export async function addSponsor(f: FormData) {
  const { db } = await requireAdmin();
  const category = s(f, "category").toLowerCase() || "general";
  const text = `${category} ${s(f, "name")}`.toLowerCase();
  if (BLOCKED_SPONSOR_WORDS.some((w) => text.includes(w))) return; // betting/gambling advertisers are never allowed
  const logo = (await upload(db, f.get("file"))) ?? opt(f, "logo_url");
  await db.from("sponsors").insert({ name: s(f, "name"), logo_url: logo, link_url: opt(f, "link_url"), category });
  revalidatePath("/admin/sponsors");
}
export async function toggleSponsor(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("sponsors").update({ active: s(f, "active") !== "true" }).eq("id", s(f, "id"));
  revalidatePath("/admin/sponsors");
}

// ───────── feed ads ─────────
export async function addAd(f: FormData) {
  const { db } = await requireAdmin();
  const image = (await upload(db, f.get("file"))) ?? opt(f, "image_url");
  await db.from("feed_ads").insert({
    sponsor_id: s(f, "sponsor_id"),
    title: s(f, "title"),
    body: opt(f, "body"),
    image_url: image,
    link_url: s(f, "link_url"),
    topic_ids: f.getAll("topic_ids").map(String),
    starts_at: dt(f, "starts_at"),
    ends_at: dt(f, "ends_at"),
  });
  revalidatePath("/admin/ads");
}
export async function toggleAd(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("feed_ads").update({ active: s(f, "active") !== "true" }).eq("id", s(f, "id"));
  revalidatePath("/admin/ads");
}

// ───────── campaigns ─────────
export async function addCampaign(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("campaigns").insert({ brand: s(f, "brand"), brief: opt(f, "brief"), fee: Number(s(f, "fee") || 0), starts_at: dt(f, "starts_at"), ends_at: dt(f, "ends_at") });
  revalidatePath("/admin/campaigns");
}
export async function inviteCreator(f: FormData) {
  const { db } = await requireAdmin();
  const alias = s(f, "alias").startsWith("@") ? s(f, "alias") : `@${s(f, "alias")}`;
  const { data: p } = await db.from("profiles").select("id").eq("alias", alias).maybeSingle();
  if (!p) return;
  await db.from("campaign_creators").upsert({ campaign_id: s(f, "campaign_id"), user_id: p.id, payout: Number(s(f, "payout") || 0) });
  await db.from("notifications").insert({ user_id: p.id, kind: "campaign", data: { campaign_id: s(f, "campaign_id") } });
  revalidatePath("/admin/campaigns");
}

// ───────── settings & blocklist ─────────
const SWITCHES = ["feature_sponsored_challenges", "feature_branded_templates", "feature_feed_ads", "feature_premium", "feature_tips", "feature_campaigns"];
const NUMBERS = ["tip_fee_percent", "premium_price_ugx", "ad_every_n_memes", "max_posts_per_day", "max_comments_per_day", "reports_to_autohide"];

// Allowed range for each number, so a typo can't break pricing or posting.
const LIMITS: Record<string, [number, number]> = {
  tip_fee_percent: [0, 50],
  premium_price_ugx: [500, 1_000_000],
  ad_every_n_memes: [3, 100],
  max_posts_per_day: [1, 200],
  max_comments_per_day: [1, 1000],
  reports_to_autohide: [1, 50],
};

export async function saveSettings(f: FormData) {
  const { db, adminId } = await requireAdmin();
  const { data: before } = await db.from("settings").select("key,value");
  const old = new Map((before ?? []).map((r) => [r.key as string, r.value]));
  const rows = [
    ...SWITCHES.map((key) => ({ key, value: f.get(key) === "on" })),
    ...NUMBERS.filter((k) => s(f, k) !== "").map((key) => {
      const [lo, hi] = LIMITS[key] ?? [0, Number.MAX_SAFE_INTEGER];
      return { key, value: Math.min(hi, Math.max(lo, Math.round(Number(s(f, key))))) };
    }),
  ].filter((r) => typeof r.value === "boolean" || Number.isFinite(r.value));
  const changed = rows.filter((r) => old.get(r.key) !== r.value).map((r) => `${r.key}: ${String(old.get(r.key))} → ${String(r.value)}`);
  const { error } = await db.from("settings").upsert(rows);
  if (error) redirect("/admin/settings?saved=error");
  await logAction(db, adminId, "setting_change", { note: changed.length ? changed.join("; ") : "Saved with no changes" });
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?saved=${changed.length || "none"}`);
}
export async function addBlockword(f: FormData) {
  const { db } = await requireAdmin();
  const words = s(f, "words").split(/[\n,]+/).map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (words.length) await db.from("blocklist").upsert(words.map((word) => ({ word })));
  revalidatePath("/admin/settings");
}
export async function removeBlockword(f: FormData) {
  const { db } = await requireAdmin();
  await db.from("blocklist").delete().eq("word", s(f, "word"));
  revalidatePath("/admin/settings");
}
