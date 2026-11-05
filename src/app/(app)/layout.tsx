import { Suspense } from "react";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import AnalyticsPing from "@/components/AnalyticsPing";

/**
 * Phone: one column with a bottom tab bar.
 * Tablet / desktop (md+): sidebar on the left, wider content on the right.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-dvh md:bg-lilac">
        <div className="mx-auto flex max-w-md md:max-w-5xl">
          <Suspense fallback={<div className="hidden w-56 shrink-0 md:block lg:w-64" />}>
            <SideNav />
          </Suspense>
          <div className="min-h-dvh min-w-0 flex-1 bg-white pb-24 shadow-sm md:pb-8">{children}</div>
        </div>
      </div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <AnalyticsPing />
    </>
  );
}
