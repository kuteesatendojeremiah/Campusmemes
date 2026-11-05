"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { randomAlias, randomAvatar } from "@/lib/alias";
import HouseRules from "@/components/HouseRules";

type Step = "email" | "alias" | "done";

export default function SignUp() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [step, setStep] = useState<Step>("email");
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  /** Email + password: sign up (new) or log in (returning). */
  const emailAuth = () =>
    run(async () => {
      const em = email.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return "Enter a valid email address.";
      if (password.length < 8) return "Password must be at least 8 characters.";
      const res = isLogin
        ? await supabase.auth.signInWithPassword({ email: em, password })
        : await supabase.auth.signUp({ email: em, password });
      if (res.error) {
        const m = res.error.message.toLowerCase();
        if (m.includes("invalid login")) return "Wrong email or password.";
        if (m.includes("already registered")) return "That email already has an account. Log in instead.";
        if (m.includes("confirmation email")) return "Sign-up is temporarily unavailable. Please try again later.";
        return res.error.message;
      }
      if (!res.data.session) return "Check your email to confirm your account, then log in.";
      const { data: p } = await supabase.from("profiles").select("id").eq("id", res.data.user!.id).maybeSingle();
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

      {step === "email" && (
        <>
          <h2 className="text-center text-lg font-bold text-brand">{isLogin ? "Log in" : "Create your account"}</h2>
          <label className="block text-sm font-semibold">Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[14px] border border-gray-300 p-3 text-lg"
          />
          <label className="block text-sm font-semibold">Password</label>
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && email && password && emailAuth()}
            className="w-full rounded-[14px] border border-gray-300 p-3 text-lg"
          />
          <p className="text-xs text-gray-500">🔒 Private. Never shown to anyone.</p>
          <button className={btn} disabled={busy || !email || !password} onClick={emailAuth}>
            {isLogin ? "Log in" : "Sign up"}
          </button>
          <button className="w-full text-sm text-brand underline" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
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
      <p className="text-center text-xs text-gray-600">
        <a href="/privacy" className="underline">Privacy &amp; terms</a>
      </p>
    </main>
  );
}
