"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Email-code login for admins. Only works for emails that already exist as auth users. */
export default function AdminLogin() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (!sent) {
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
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent}
          placeholder="Admin email" className="rounded border p-3 text-black" />
        {sent && (
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Code from your email" className="rounded border p-3 text-black" />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="rounded bg-black p-3 font-semibold text-white disabled:opacity-50">
          {sent ? "Verify" : "Send code"}
        </button>
        {!sent && (
          <button type="button" onClick={() => email.trim() ? (setError(""), setSent(true)) : setError("Enter your email first.")}
            className="text-sm underline">
            I already have a code
          </button>
        )}
      </form>
    </main>
  );
}
