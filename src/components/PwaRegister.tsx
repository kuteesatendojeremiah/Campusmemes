"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function PwaRegister() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvt) return null;
  return (
    <button
      onClick={async () => {
        await installEvt.prompt();
        setInstallEvt(null);
      }}
      className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-accent px-5 py-2 text-sm font-bold text-brand shadow-lg"
    >
      Add CampusMemes to Home Screen
    </button>
  );
}
