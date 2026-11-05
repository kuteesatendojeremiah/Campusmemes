import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** AI caption ideas. The API key stays on the server. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI captions aren't switched on yet." }, { status: 503 });

  const { topic = "student life", template = "", hint = "" } = await req.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 300,
      system:
        "You write short, funny meme captions for Ugandan university students. Laugh at situations, never at people. " +
        "Never use real names, school names, lecturers' names, or anything sexual, hateful, tribal or targeting. " +
        'Reply with ONLY a JSON array of 3 objects like [{"top":"...","bottom":"..."}]. Each line max 8 words, plain text.',
      messages: [
        {
          role: "user",
          content: `Topic: ${String(topic).slice(0, 60)}\nTemplate: ${String(template).slice(0, 60)}\nIdea: ${String(hint).slice(0, 120)}`,
        },
      ],
    }),
  });
  if (!res.ok) return NextResponse.json({ error: "Caption service is busy. Try again." }, { status: 502 });

  try {
    const json = await res.json();
    const text: string = json.content?.[0]?.text ?? "[]";
    const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const captions = arr
      .slice(0, 3)
      .map((c: { top?: string; bottom?: string }) => ({ top: String(c.top ?? "").slice(0, 80), bottom: String(c.bottom ?? "").slice(0, 80) }));
    return NextResponse.json({ captions });
  } catch {
    return NextResponse.json({ error: "Couldn't read the suggestions. Try again." }, { status: 502 });
  }
}
