"use client";
import { useState } from "react";

const AMOUNTS = [500, 1000, 2000, 5000];

/** Tip a meme's creator by Mobile Money. The creator never sees who tipped. */
export default function TipButton({ memeId, phone, sandbox }: { memeId: string; phone: string; sandbox: boolean }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [msisdn, setMsisdn] = useState(phone);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/tip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memeId, amount, msisdn }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Tip failed.");
    setDone(true);
  }

  if (done) return <p className="rounded-[14px] bg-green-50 p-3 text-center text-sm font-bold text-green-700">💸 Tip sent. Thank you!</p>;

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="w-full rounded-full border border-brand py-2.5 text-sm font-bold text-brand">
        💸 Tip this creator
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-[14px] bg-lilac p-3">
          <div className="flex gap-2">
            {AMOUNTS.map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={`flex-1 rounded-full py-1.5 text-xs font-bold ${amount === a ? "bg-brand text-white" : "bg-white text-brand"}`}>
                {a.toLocaleString()}
              </button>
            ))}
          </div>
          <input inputMode="tel" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="Your MoMo number 07XX XXX XXX" className="w-full rounded-[14px] border border-gray-300 p-2.5 text-sm" />
          <button onClick={send} disabled={busy} className="w-full rounded-full bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Waiting for approval…" : `Send UGX ${amount.toLocaleString()}`}
          </button>
          <p className="text-xs text-gray-500">Anonymous: the creator never sees who tipped. Your number stays private.{sandbox ? " Test mode: no real money moves." : ""}</p>
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      )}
    </div>
  );
}
