"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Admin login: email + password (main) or an email code (fallback). Only existing auth users can sign in. */
export default function AdminLogin() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError("Wrong email or password.");
      else router.replace("/admin");
    } else if (!sent) {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) setError("Could not send a code to that email.");
      else setSent(true);
    } else {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
      if (error) setError("That code didn't work. Try again.");
      else router.replace("/admin");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === "code" && sent}
          autoComplete="username" placeholder="Admin email" className="rounded border p-3 text-black" />
        {mode === "password" && (
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" placeholder="Password" className="rounded border p-3 text-black" />
        )}
        {mode === "code" && sent && (
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Code from your email" className="rounded border p-3 text-black" />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="rounded bg-black p-3 font-semibold text-white disabled:opacity-50">
          {mode === "password" ? "Sign in" : sent ? "Verify" : "Send code"}
        </button>
        <button type="button" className="text-sm underline"
          onClick={() => { setMode(mode === "password" ? "code" : "password"); setSent(false); setError(""); }}>
          {mode === "password" ? "Use an email code instead" : "Use password instead"}
        </button>
      </form>
    </main>
  );
}
