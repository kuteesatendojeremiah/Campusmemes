"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CampaignAnswer({ campaignId, status }: { campaignId: string; status: string }) {
  const [supabase] = useState(() => createClient());
  const [s, setS] = useState(status);
  const [err, setErr] = useState("");

  async function answer(next: "accepted" | "declined") {
    setErr("");
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from("campaign_creators").update({ status: next }).eq("campaign_id", campaignId).eq("user_id", data.user!.id);
    if (error) setErr("Couldn't save your answer. Try again.");
    else setS(next);
  }

  return (
    <div>
      {s === "invited" ? (
        <div className="flex gap-2">
          <button onClick={() => answer("declined")} className="flex-1 rounded-full border border-brand py-3 font-bold text-brand">Decline</button>
          <button onClick={() => answer("accepted")} className="flex-1 rounded-full bg-brand py-3 font-bold text-white">Accept</button>
        </div>
      ) : (
        <p className="rounded-[14px] bg-lilac p-3 text-center text-sm font-bold text-brand">{s === "accepted" ? "✅ You accepted this campaign" : "You declined this campaign"}</p>
      )}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
