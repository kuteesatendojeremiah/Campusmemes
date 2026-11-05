import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

/** Only users listed in the admins table get through. Everyone else sees a 404. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) notFound();
  const db = createAdminClient();
  const { data: row } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) notFound();
  return { db, adminId: data.user.id };
}

export async function logAction(
  db: ReturnType<typeof createAdminClient>,
  adminId: string,
  action: "keep" | "remove" | "warn" | "suspend" | "ban" | "unban" | "setting_change",
  extra: { target_user?: string | null; target_meme?: string | null; target_comment?: string | null; note?: string } = {},
) {
  await db.from("moderation_actions").insert({ admin_id: adminId, action, ...extra });
}

export const BLOCKED_SPONSOR_WORDS = ["bet", "betting", "gambl", "casino", "sportybet", "lottery"];
