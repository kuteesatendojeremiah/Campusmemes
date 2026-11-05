"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "./nav-tabs";

/** Tablet and desktop navigation: a sticky sidebar. Hidden on phones, where BottomNav is used. */
export default function SideNav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-white p-4 md:flex lg:w-64">
      <Link href="/" className="mb-5 block text-2xl font-extrabold text-brand">
        Campus<span className="rounded bg-accent px-1">Memes</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {TABS.filter((t) => t.href !== "/create").map((t) => {
          const active = isActive(path, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-base ${active ? "bg-lilac font-bold text-brand" : "text-gray-700 hover:bg-lilac/60"}`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/create" className="mt-4 rounded-full bg-accent py-3 text-center font-extrabold text-brand shadow hover:brightness-95">
        + Create meme
      </Link>
      <p className="mt-auto text-xs text-gray-500">Student life, anonymous memes</p>
    </aside>
  );
}
