"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALIAS_STYLES, FRAMES } from "@/lib/premium";

export default function PremiumClient({
  active,
  until,
  frame,
  aliasStyle,
  phone,
  sandbox,
  canBuy,
}: {
  active: boolean;
  until: string | null;
  frame: string;
  aliasStyle: string;
  phone: string;
  sandbox: boolean;
  canBuy: boolean;
}) {
  const router = useRouter();
  const [msisdn, setMsisdn] = useState(phone);
  const [f, setF] = useState(frame);
  const [a, setA] = useState(aliasStyle);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function buy() {
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msisdn }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Payment failed.");
    setMsg("You're Premium! ⭐");
    router.refresh();
  }

  async function saveStyle(nf: string, na: string) {
    setF(nf);
    setA(na);
    await fetch("/api/premium/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frame: nf, aliasStyle: na }) });
    router.refresh();
  }

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "bg-brand text-white" : "bg-lilac text-brand"}`;

  return (
    <div className="space-y-4">
      {active && until && <p className="rounded-[14px] bg-lilac p-3 text-center text-sm font-bold text-brand">⭐ Premium until {new Date(until).toLocaleDateString()}</p>}

      {canBuy && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500">{active ? "Extend by 30 days" : "Pay with MTN MoMo or Airtel Money"}</label>
          <input inputMode="tel" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="07XX XXX XXX" className="w-full rounded-[14px] border border-gray-300 p-3" />
          <button onClick={buy} disabled={busy} className="w-full rounded-full bg-brand py-3 font-bold text-white disabled:opacity-50">
            {busy ? "Waiting for approval…" : active ? "Extend Premium" : "Get Premium"}
          </button>
          {sandbox && <p className="text-xs text-gray-500">Test mode: no real money moves. A number ending 0000 simulates a failed payment.</p>}
          <p className="text-xs text-gray-500">Your payment number is never shown to anyone.</p>
        </div>
      )}
      {err && <p className="rounded-[14px] bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-[14px] bg-green-50 p-3 text-sm text-green-700">{msg}</p>}

      {active && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-500">Avatar frame</p>
            <div className="flex flex-wrap gap-2">
              <button className={chip(!f)} onClick={() => saveStyle("", a)}>None</button>
              {Object.entries(FRAMES).map(([k, v]) => (
                <button key={k} className={chip(f === k)} onClick={() => saveStyle(k, a)}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-500">Alias style</p>
            <div className="flex flex-wrap gap-2">
              <button className={chip(!a)} onClick={() => saveStyle(f, "")}>None</button>
              {Object.entries(ALIAS_STYLES).map(([k, v]) => (
                <button key={k} className={chip(a === k)} onClick={() => saveStyle(f, k)}>{v.label}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">Premium templates and fonts are in the meme maker.</p>
        </div>
      )}
    </div>
  );
}
