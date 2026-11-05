"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Records one sponsor impression (no personal data beyond the user id the analytics table already scopes). */
export default function ImpressionTracker({ challengeId, sponsorId }: { challengeId: string; sponsorId: string }) {
  const [supabase] = useState(() => createClient());
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      await supabase.from("analytics_events").insert({ event: "ad_impression", user_id: data.user?.id ?? null, challenge_id: challengeId, sponsor_id: sponsorId });
    })();
  }, [supabase, challengeId, sponsorId]);
  return null;
}
