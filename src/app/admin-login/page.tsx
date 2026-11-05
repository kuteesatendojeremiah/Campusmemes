"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Admin login: email + password. Only existing auth users in the admins table get into /admin. */
export default function AdminLogin() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Wrong email or password.");
    else router.replace("/admin");
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="username" placeholder="Admin email" className="rounded border p-3 text-black" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" placeholder="Password" className="rounded border p-3 text-black" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="rounded bg-black p-3 font-semibold text-white disabled:opacity-50">Sign in</button>
      </form>
    </main>
  );
}
