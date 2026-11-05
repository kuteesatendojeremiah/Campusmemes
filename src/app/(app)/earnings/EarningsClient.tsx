"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EarningsClient({ balance, phone, sandbox }: { balance: number; phone: string; sandbox: boolean }) {
  const router = useRouter();
  const [msisdn, setMsisdn] = useState(phone);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    setOk("");
    const res = await fetch("/api/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), msisdn }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Withdrawal failed.");
    setOk("Sent to your Mobile Money number ✅");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-500">Withdraw to your own Mobile Money number</label>
      <input inputMode="tel" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="07XX XXX XXX" className="w-full rounded-[14px] border border-gray-300 p-3" />
      <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount (UGX)" className="w-full rounded-[14px] border border-gray-300 p-3" />
      <button onClick={go} disabled={busy || balance <= 0} className="w-full rounded-full bg-brand py-3 font-bold text-white disabled:opacity-50">
        {busy ? "Sending…" : "Withdraw"}
      </button>
      <p className="text-xs text-gray-500">Minimum UGX 2,000. Your number is private.{sandbox ? " Test mode: no real money moves." : ""}</p>
      {err && <p className="rounded-[14px] bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {ok && <p className="rounded-[14px] bg-green-50 p-3 text-sm text-green-700">{ok}</p>}
    </div>
  );
}
