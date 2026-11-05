"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Records one app_open per browser session, for the admin's daily-active-users number. */
export default function AnalyticsPing() {
  useEffect(() => {
    if (sessionStorage.getItem("cm_open")) return;
    sessionStorage.setItem("cm_open", "1");
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("analytics_events").insert({ event: "app_open", user_id: data.user.id }).then(() => {});
    });
  }, []);
  return null;
}
