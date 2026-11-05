"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Konva from "konva";
import { Stage, Layer, Image as KImage, Text as KText, Transformer } from "react-konva";
import { createClient } from "@/lib/supabase/client";
import { compressPhoto, encodeSmall, loadImage } from "@/lib/image";
import { DEFAULT_FONT, PREMIUM_FONTS, isPremiumNow } from "@/lib/premium";

type Item = { id: string; text: string; x: number; y: number; width: number; fontSize: number; rotation: number; kind: "text" | "sticker"; font?: string };
type Template = { id: string; name: string; image_url: string; sponsor_id: string | null; premium_only: boolean; sponsored_from: string | null; sponsored_until: string | null };
type Topic = { id: string; name: string; emoji: string | null };
type Challenge = { id: string; title: string; template_id: string | null };
type Caption = { top: string; bottom: string };

const SIZE_MAX = 400;
const STICKERS = ["😂", "💀", "🔥", "😭", "🤡", "👀", "🙏🏾", "💸", "🥵", "😴", "📚", "🍳", "🏍️", "⚡", "💧"];

const uid = () => Math.random().toString(36).slice(2);

export default function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const [supabase] = useState(() => createClient());

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState(340);

  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [alias, setAlias] = useState("");
  const [premium, setPremium] = useState(false);
  const [brandedOn, setBrandedOn] = useState(true);
  const [target, setTarget] = useState<string>(""); // "topic:<id>" | "challenge:<id>"

  const [panel, setPanel] = useState<"" | "template" | "stickers" | "ai">("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [aiHint, setAiHint] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // size the canvas to the container
  useEffect(() => {
    const w = Math.min(wrapRef.current?.clientWidth ?? 340, SIZE_MAX);
    setSize(w);
  }, []);

  const defaultTexts = useCallback(
    (w: number): Item[] => [
      { id: uid(), text: "TOP TEXT", x: 10, y: 10, width: w - 20, fontSize: Math.round(w / 9), rotation: 0, kind: "text" },
      { id: uid(), text: "BOTTOM TEXT", x: 10, y: w - Math.round(w / 9) - 20, width: w - 20, fontSize: Math.round(w / 9), rotation: 0, kind: "text" },
    ],
    [],
  );

  // load data
  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: tp }, { data: ch }, { data: u }, { data: flag }] = await Promise.all([
        supabase.from("templates").select("id,name,image_url,sponsor_id,premium_only,sponsored_from,sponsored_until").eq("active", true),
        supabase.from("topics").select("id,name,emoji").eq("active", true).order("name"),
        supabase.from("challenges").select("id,title,template_id").lte("starts_at", new Date().toISOString()).gte("ends_at", new Date().toISOString()).limit(1),
        supabase.auth.getUser(),
        supabase.from("settings").select("value").eq("key", "feature_branded_templates").maybeSingle(),
      ]);
      const on = flag?.value === true;
      setBrandedOn(on);
      // Sponsored templates inside their dates go first in the row.
      const now = Date.now();
      const live = (x: Template) =>
        on && !!x.sponsor_id && (!x.sponsored_from || new Date(x.sponsored_from).getTime() <= now) && (!x.sponsored_until || new Date(x.sponsored_until).getTime() >= now);
      setTemplates([...(t ?? [])].sort((a, b) => Number(live(b)) - Number(live(a))));
      setTopics(tp ?? []);
      setChallenge(ch?.[0] ?? null);
      if (u.user) {
        const { data: p } = await supabase.from("profiles").select("alias,is_premium,premium_until").eq("id", u.user.id).maybeSingle();
        setAlias(p?.alias ?? "");
        setPremium(isPremiumNow(p));
      }
      if (ch?.[0]) setTarget(`challenge:${ch[0].id}`);
      else if (tp?.[0]) setTarget(`topic:${tp[0].id}`);
    })();
  }, [supabase]);

  // initial texts once size known
  useEffect(() => {
    setItems((cur) => (cur.length ? cur : defaultTexts(size)));
  }, [size, defaultTexts]);

  const pickTemplate = useCallback(
    async (t: Template) => {
      if (t.premium_only && !premium) {
        setError("That template is for Premium members. Get Premium from your profile.");
        return;
      }
      setError("");
      setBg(await loadImage(t.image_url));
      setTemplateId(t.id);
      setTemplateName(t.name);
      setPanel("");
    },
    [premium],
  );

  // "Use this template" deep link: /create?template=<id>
  const wanted = params.get("template") ?? (challenge && params.get("challenge") === challenge.id ? challenge.template_id : null);
  useEffect(() => {
    if (!wanted || templateId) return;
    const t = templates.find((x) => x.id === wanted);
    if (t) pickTemplate(t);
  }, [wanted, templates, templateId, pickTemplate]);

  // attach transformer to selected node
  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;
    const node = selected ? stage.findOne("#" + selected) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, items]);

  const update = (id: string, patch: Partial<Item>) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const sel = items.find((i) => i.id === selected);

  function addText() {
    const it: Item = { id: uid(), text: "NEW TEXT", x: 20, y: size / 2 - 20, width: size - 40, fontSize: Math.round(size / 10), rotation: 0, kind: "text" };
    setItems((c) => [...c, it]);
    setSelected(it.id);
  }
  function addSticker(emoji: string) {
    const it: Item = { id: uid(), text: emoji, x: size / 2 - 30, y: size / 2 - 30, width: 80, fontSize: 60, rotation: 0, kind: "sticker" };
    setItems((c) => [...c, it]);
    setSelected(it.id);
    setPanel("");
  }
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("Preparing photo…");
    try {
      setBg(await loadImage(await compressPhoto(f)));
      setTemplateId(null);
      setTemplateName("");
    } catch {
      setError("Couldn't open that picture.");
    }
    setBusy("");
    e.target.value = "";
  }

  async function suggest() {
    setBusy("Thinking of captions…");
    setError("");
    const topicName = topics.find((t) => target === `topic:${t.id}`)?.name ?? "student life";
    const res = await fetch("/api/caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topicName, template: templateName, hint: aiHint }),
    });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "AI captions failed.");
    else setCaptions(j.captions);
    setBusy("");
  }
  function applyCaption(c: Caption) {
    setItems((cur) => {
      const texts = cur.filter((i) => i.kind === "text");
      if (texts[0]) cur = cur.map((i) => (i.id === texts[0].id ? { ...i, text: c.top.toUpperCase() } : i));
      if (texts[1]) cur = cur.map((i) => (i.id === texts[1].id ? { ...i, text: c.bottom.toUpperCase() } : i));
      return cur;
    });
    setPanel("");
  }

  function exportDataUrl(width: number, quality = 0.85, mimeType = "image/jpeg") {
    setSelected(null);
    trRef.current?.nodes([]);
    return stageRef.current!.toDataURL({ pixelRatio: width / size, mimeType, quality });
  }

  function saveToPhone() {
    const a = document.createElement("a");
    a.href = exportDataUrl(1080);
    a.download = "campusmeme.jpg";
    a.click();
  }

  async function post() {
    setError("");
    if (!bg) return setError("Pick a template or add a photo first.");
    if (!target) return setError("Choose where to post.");
    setBusy("Posting…");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uidv = auth.user!.id;
      // Small files save storage and mobile data: 720px WebP (JPEG fallback) plus a 360px thumbnail.
      const full = await encodeSmall((mime) => exportDataUrl(720, 0.8, mime));
      const thumb = await encodeSmall((mime) => exportDataUrl(360, 0.7, mime));
      const name = `${uidv}/${crypto.randomUUID()}`;
      const fullPath = `${name}.${full.ext}`;
      const thumbPath = `${name}_t.${thumb.ext}`;
      // Filenames are unique and never change, so browsers and the CDN may cache them for a year.
      const opts = (type: string) => ({ contentType: type, cacheControl: "31536000" });
      const up1 = await supabase.storage.from("memes").upload(fullPath, full.blob, opts(full.type));
      const up2 = await supabase.storage.from("memes").upload(thumbPath, thumb.blob, opts(thumb.type));
      if (up1.error || up2.error) throw new Error("upload");
      const [kind, id] = target.split(":");
      // The server checks bans, daily limits and the word filter, then saves the meme.
      const res = await fetch("/api/memes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: fullPath,
          thumbPath,
          topicId: kind === "topic" ? id : null,
          challengeId: kind === "challenge" ? id : null,
          templateId,
          texts: items.filter((i) => i.kind === "text").map((i) => i.text),
        }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Couldn't post your meme.");
        setBusy("");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't post your meme. Check your connection and try again.");
      setBusy("");
    }
  }

  // cover-fit the background
  const bgProps = bg
    ? (() => {
        const s = Math.max(size / bg.width, size / bg.height);
        return { width: bg.width * s, height: bg.height * s, x: (size - bg.width * s) / 2, y: (size - bg.height * s) / 2 };
      })()
    : null;

  const chip = "rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand";

  return (
    <div ref={wrapRef} className="space-y-3">
      <div className="relative mx-auto overflow-hidden rounded-[14px] bg-lilac" style={{ width: size, height: size }}>
        <Stage
          ref={stageRef}
          width={size}
          height={size}
          onMouseDown={(e) => e.target === e.target.getStage() && setSelected(null)}
          onTouchStart={(e) => e.target === e.target.getStage() && setSelected(null)}
        >
          <Layer>
            {bg && bgProps && <KImage image={bg} {...bgProps} onClick={() => setSelected(null)} onTap={() => setSelected(null)} />}
            {items.map((i) => (
              <KText
                key={i.id}
                id={i.id}
                text={i.text}
                x={i.x}
                y={i.y}
                width={i.kind === "text" ? i.width : undefined}
                fontSize={i.fontSize}
                rotation={i.rotation}
                draggable
                align="center"
                fontFamily={i.kind === "text" ? (i.font ?? DEFAULT_FONT) : undefined}
                fontStyle="bold"
                fill="#fff"
                stroke={i.kind === "text" ? "#000" : undefined}
                strokeWidth={i.kind === "text" ? Math.max(2, i.fontSize / 12) : 0}
                fillAfterStrokeEnabled
                onClick={() => setSelected(i.id)}
                onTap={() => setSelected(i.id)}
                onDragEnd={(e) => update(i.id, { x: e.target.x(), y: e.target.y() })}
                onTransformEnd={(e) => {
                  const n = e.target;
                  const sx = n.scaleX();
                  update(i.id, { x: n.x(), y: n.y(), rotation: n.rotation(), fontSize: Math.max(10, i.fontSize * sx), width: Math.max(40, i.width * sx) });
                  n.scaleX(1);
                  n.scaleY(1);
                }}
              />
            ))}
            <Transformer ref={trRef} rotateEnabled enabledAnchors={["middle-left", "middle-right", "top-left", "top-right", "bottom-left", "bottom-right"]} boundBoxFunc={(o, n) => (n.width < 30 ? o : n)} />
          </Layer>
        </Stage>
        {!bg && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Pick a template or add a photo
          </p>
        )}
      </div>

      {sel?.kind === "text" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={sel.text}
              onChange={(e) => update(sel.id, { text: e.target.value.toUpperCase() })}
              className="min-w-0 flex-1 rounded-[14px] border border-gray-300 p-2 text-sm"
            />
            <button className={chip} onClick={() => { setItems((c) => c.filter((i) => i.id !== sel.id)); setSelected(null); }}>
              Delete
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button className={chip} onClick={() => update(sel.id, { font: undefined })}>Classic</button>
            {PREMIUM_FONTS.map((f) => (
              <button
                key={f.label}
                className={chip}
                onClick={() => (premium ? update(sel.id, { font: f.family }) : setError("Extra fonts are for Premium members. Get Premium from your profile."))}
              >
                {premium ? "⭐" : "🔒"} {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {sel?.kind === "sticker" && (
        <button className={chip} onClick={() => { setItems((c) => c.filter((i) => i.id !== sel.id)); setSelected(null); }}>
          Delete sticker
        </button>
      )}

      {/* toolbar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={chip} onClick={addText}>Aa Text</button>
        <button className={chip} onClick={() => setPanel(panel === "template" ? "" : "template")}>🖼️ Template</button>
        <button className={chip} onClick={() => setPanel(panel === "stickers" ? "" : "stickers")}>😂 Stickers</button>
        <label className={`${chip} cursor-pointer`}>
          📷 Photo
          <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        </label>
        <button className={chip} onClick={() => setPanel(panel === "ai" ? "" : "ai")}>✨ AI Caption</button>
      </div>

      {panel === "template" && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Trending templates</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button key={t.id} onClick={() => pickTemplate(t)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-lilac">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image_url} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
                {t.premium_only && <span className="absolute right-0 top-0 rounded-bl bg-brand px-1 text-[9px] font-bold text-white">{premium ? "⭐" : "🔒 Premium"}</span>}
                {brandedOn && t.sponsor_id && (!t.sponsored_from || new Date(t.sponsored_from) <= new Date()) && (!t.sponsored_until || new Date(t.sponsored_until) >= new Date()) && <span className="absolute left-0 top-0 rounded-br bg-accent px-1 text-[9px] font-bold text-brand">Sponsored</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "stickers" && (
        <div className="flex flex-wrap gap-2 rounded-[14px] bg-lilac p-3">
          {STICKERS.map((s) => (
            <button key={s} className="text-3xl" onClick={() => addSticker(s)}>{s}</button>
          ))}
        </div>
      )}

      {panel === "ai" && (
        <div className="space-y-2 rounded-[14px] bg-lilac p-3">
          <div className="flex gap-2">
            <input
              placeholder="What's the meme about? (optional)"
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              className="min-w-0 flex-1 rounded-[14px] border border-gray-300 p-2 text-sm"
            />
            <button className="rounded-full bg-brand px-4 text-sm font-bold text-white" onClick={suggest} disabled={!!busy}>
              Suggest
            </button>
          </div>
          {captions.map((c, i) => (
            <button key={i} onClick={() => applyCaption(c)} className="block w-full rounded-xl bg-white p-2 text-left text-sm">
              <b>{c.top}</b>
              <br />
              {c.bottom}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">Post to</label>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-[14px] border border-gray-300 bg-white p-2.5 text-sm">
          {challenge && <option value={`challenge:${challenge.id}`}>🏆 Challenge: {challenge.title}</option>}
          {topics.map((t) => (
            <option key={t.id} value={`topic:${t.id}`}>{t.emoji} {t.name}</option>
          ))}
        </select>
        {alias && <p className="mt-1 text-xs text-gray-500">as {alias}</p>}
      </div>

      {error && <p className="rounded-[14px] bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button onClick={saveToPhone} disabled={!bg} className="flex-1 rounded-full border border-brand py-3 font-bold text-brand disabled:opacity-40">
          Save to phone
        </button>
        <button onClick={post} disabled={!!busy || !bg} className="flex-1 rounded-full bg-brand py-3 font-bold text-white disabled:opacity-50">
          {busy || "Post"}
        </button>
      </div>
    </div>
  );
}
