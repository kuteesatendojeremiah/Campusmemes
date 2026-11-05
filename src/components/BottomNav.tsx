"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "./nav-tabs";

/** Phone navigation. Hidden on tablets and desktops, where SideNav takes over. */
export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-around px-2 pb-2 pt-1">
        {TABS.map((t) => {
          const active = isActive(path, t.href);
          const create = t.href === "/create";
          return (
            <li key={t.href}>
              <Link href={t.href} className="flex flex-col items-center gap-0.5 text-[11px]">
                {create ? (
                  <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl font-black text-brand shadow-lg ring-4 ring-white">
                    +
                  </span>
                ) : (
                  <span className={`text-xl ${active ? "" : "opacity-50"}`}>{t.icon}</span>
                )}
                <span className={active ? "font-bold text-brand" : "text-gray-500"}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
