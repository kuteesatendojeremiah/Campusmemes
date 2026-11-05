"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";

export type CommentRow = {
  id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: { alias: string; avatar: string } | null;
};

export default function Comments({ memeId, comments, loggedIn, alias }: { memeId: string; comments: CommentRow[]; loggedIn: boolean; alias: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memeId, parentId: replyTo, body: text.trim() }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Couldn't post your comment. Try again.");
    setText("");
    setReplyTo(null);
    router.refresh();
  }

  async function report(commentId: string) {
    if (!loggedIn) return void (location.href = "/signup");
    const { data } = await supabase.auth.getUser();
    const { error: e } = await supabase.from("reports").insert({ reporter_id: data.user!.id, comment_id: commentId, reason: "Inappropriate comment" });
    setError(e?.code === "23505" ? "You already reported that comment." : "Thanks, we'll review that comment.");
  }

  const top = comments.filter((c) => !c.parent_id);
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);

  const Row = ({ c, reply }: { c: CommentRow; reply?: boolean }) => (
    <div className={`flex gap-2 ${reply ? "ml-8" : ""}`}>
      <span className="text-xl">{c.author?.avatar ?? "😎"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <b className="text-brand">{c.author?.alias ?? "@deleted"}</b> <span className="text-gray-400">{timeAgo(c.created_at)}</span>
        </p>
        <p className="break-words text-sm">{c.body}</p>
        <div className="flex gap-3">
          {!reply && loggedIn && (
            <button className="text-xs font-semibold text-gray-500" onClick={() => setReplyTo(c.id)}>
              Reply
            </button>
          )}
          <button className="text-xs text-gray-400" onClick={() => report(c.id)}>
            Report
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-3">
      <h2 className="font-bold text-brand">Comments ({comments.length})</h2>
      {top.map((c) => (
        <div key={c.id} className="space-y-2">
          <Row c={c} />
          {replies(c.id).map((r) => (
            <Row key={r.id} c={r} reply />
          ))}
        </div>
      ))}
      {top.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}

      {loggedIn ? (
        <div className="space-y-1">
          {replyTo && (
            <p className="text-xs text-gray-500">
              Replying… <button className="underline" onClick={() => setReplyTo(null)}>cancel</button>
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Comment as ${alias}`}
              className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
            />
            <button onClick={send} disabled={busy || !text.trim()} className="rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50">
              Send
            </button>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      ) : (
        <a href="/signup" className="block text-center text-sm font-semibold text-brand underline">
          Join to comment
        </a>
      )}
    </section>
  );
}
