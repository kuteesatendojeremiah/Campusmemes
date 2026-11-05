"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone, randomAlias, randomAvatar } from "@/lib/alias";
import HouseRules from "@/components/HouseRules";

type Step = "phone" | "code" | "alias" | "done";

export default function SignUp() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [alias, setAlias] = useState("");
  const [avatar, setAvatar] = useState("😎");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAlias(randomAlias());
    setAvatar(randomAvatar());
    // Returning visitors: skip straight to the app, or to alias setup if they never finished.
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (p) router.replace("/");
      else setStep("alias");
    })();
  }, [supabase, router]);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    const err = await fn();
    if (err) setError(err);
    setBusy(false);
  }

  const sendCode = () =>
    run(async () => {
      const p = normalizePhone(phoneInput);
      if (!p) return "Enter a valid Ugandan number, e.g. 0772 123456.";
      const { error } = await supabase.auth.signInWithOtp({ phone: p });
      if (error) return error.message;
      setPhone(p);
      setStep("code");
    });

  const verify = () =>
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
      if (error) return "That code didn't work. Check it and try again.";
      const { data } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("id").eq("id", data.user!.id).maybeSingle();
      if (p) return void router.replace("/");
      setStep("alias");
    });

  const finish = () =>
    run(async () => {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, avatar, acceptedRules: accepted }),
      });
      if (!res.ok) return (await res.json()).error ?? "Something went wrong.";
      setStep("done");
    });

  const btn = "w-full rounded-full bg-brand py-3 font-bold text-white disabled:opacity-50";

  return (
    <main className="space-y-5 p-6">
      <div className="pt-6 text-center">
        <h1 className="text-3xl font-extrabold text-brand">
          Campus<span className="rounded bg-accent px-1">Memes</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">Student-life memes. No real names.</p>
      </div>

      {step === "phone" && (
        <>
          <label className="block text-sm font-semibold">Phone number</label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="0772 123456"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="w-full rounded-[14px] border border-gray-300 p-3 text-lg"
          />
          <p className="text-xs text-gray-500">🔒 Private. Never shown to anyone.</p>
          <button className={btn} disabled={busy || !phoneInput} onClick={sendCode}>
            Send code
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-sm">We sent a code to {phone}.</p>
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-[14px] border border-gray-300 p-3 text-center text-2xl tracking-widest"
          />
          <button className={btn} disabled={busy || code.length < 4} onClick={verify}>
            Verify
          </button>
          <button className="w-full text-sm text-brand underline" onClick={() => setStep("phone")}>
            Use a different number
          </button>
        </>
      )}

      {step === "alias" && (
        <>
          <div className="rounded-[14px] bg-lilac p-5 text-center">
            <div className="text-5xl">{avatar}</div>
            <p className="mt-2 text-xl font-bold text-brand">{alias}</p>
            <button
              className="mt-3 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand"
              onClick={() => {
                setAlias(randomAlias());
                setAvatar(randomAvatar());
              }}
            >
              🔀 Shuffle
            </button>
          </div>
          <div className="rounded-[14px] border border-gray-200 p-4">
            <h2 className="mb-2 font-bold text-brand">House rules</h2>
            <HouseRules />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4" />I accept the house rules and the{" "}
            <a href="/privacy" className="text-brand underline">terms</a>.
          </label>
          <button className={btn} disabled={busy || !accepted} onClick={finish}>
            Start memeing
          </button>
        </>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <p className="text-5xl">🎉</p>
          <p className="font-bold text-brand">Welcome, {alias}!</p>
          <div className="rounded-[14px] bg-lilac p-4 text-sm text-gray-700">
            <p className="font-semibold">Add CampusMemes to your home screen</p>
            <p>Android Chrome: tap the yellow &quot;Add to Home Screen&quot; button, or menu ⋮ → Add to Home screen.</p>
            <p>iPhone Safari: tap Share → Add to Home Screen.</p>
          </div>
          <button className={btn} onClick={() => router.replace("/")}>
            Go to the feed
          </button>
        </div>
      )}

      {error && <p className="rounded-[14px] bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="text-center text-xs text-gray-400">
        <a href="/privacy" className="underline">Privacy &amp; terms</a>
      </p>
    </main>
  );
}
