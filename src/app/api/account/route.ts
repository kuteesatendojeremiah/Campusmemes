import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Delete the signed-in user's account and all their content (cascades from profiles). */
export async function DELETE() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { error } = await createAdminClient().auth.admin.deleteUser(data.user.id);
  if (error) return NextResponse.json({ error: "Could not delete account." }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
