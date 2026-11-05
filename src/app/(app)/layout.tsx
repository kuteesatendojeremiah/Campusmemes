import { Suspense } from "react";
import BottomNav from "@/components/BottomNav";
import AnalyticsPing from "@/components/AnalyticsPing";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-md bg-white pb-24 shadow-sm">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <AnalyticsPing />
    </>
  );
}
