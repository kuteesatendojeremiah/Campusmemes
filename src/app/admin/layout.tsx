import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "CampusMemes Admin", robots: { index: false } };

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/moderation", "Moderation"],
  ["/admin/users", "Users"],
  ["/admin/topics", "Topics"],
  ["/admin/challenges", "Challenges"],
  ["/admin/templates", "Templates & stickers"],
  ["/admin/sponsors", "Sponsors"],
  ["/admin/ads", "Feed ads"],
  ["/admin/campaigns", "Campaigns"],
  ["/admin/payments", "Payments"],
  ["/admin/reports", "Reports export"],
  ["/admin/settings", "Settings"],
];

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50 text-sm md:flex">
      <nav className="shrink-0 bg-brand p-3 text-white md:sticky md:top-0 md:h-dvh md:w-52 md:self-start md:overflow-y-auto">
        <p className="mb-3 text-lg font-extrabold">Admin</p>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {LINKS.map(([href, label]) => (
            <li key={href} className="shrink-0">
              <Link href={href} className="block rounded-lg px-3 py-1.5 hover:bg-white/15">{label}</Link>
            </li>
          ))}
          <li className="shrink-0"><Link href="/" className="block rounded-lg px-3 py-1.5 text-accent">← Back to app</Link></li>
        </ul>
      </nav>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-200" />}>
          <Guard>{children}</Guard>
        </Suspense>
      </main>
    </div>
  );
}
