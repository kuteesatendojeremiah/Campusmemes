"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AdRow = {
  id: string;
  sponsor_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string;
  sponsor: { name: string } | null;
};

/** A feed ad. Always labelled "Sponsored". Counts one impression when half visible, and taps. */
export default function AdCard({ ad }: { ad: AdRow }) {
  const [supabase] = useState(() => createClient());
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  async function log(event: "ad_impression" | "ad_tap") {
    const { data } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({ event, user_id: data.user?.id ?? null, ad_id: ad.id, sponsor_id: ad.sponsor_id });
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          log("ad_impression");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <article ref={ref} className="overflow-hidden rounded-[14px] border border-accent bg-white shadow-sm">
      <header className="flex items-center justify-between p-3">
        <p className="truncate text-sm font-bold text-brand">{ad.sponsor?.name}</p>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-brand">Sponsored</span>
      </header>
      {ad.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt={ad.title} loading="lazy" className="w-full" />
      )}
      <div className="p-3">
        <p className="font-bold">{ad.title}</p>
        {ad.body && <p className="text-sm text-gray-600">{ad.body}</p>}
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => log("ad_tap")}
          className="mt-2 block rounded-full bg-brand py-2 text-center text-sm font-bold text-white"
        >
          Learn more
        </a>
      </div>
    </article>
  );
}
