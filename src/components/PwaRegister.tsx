"use client";
import { useEffect } from "react";
import { setInstallEvent, type InstallEvent } from "./install-store";

/** Registers the service worker and remembers the install prompt. It shows nothing itself. */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop the browser's own banner; the Install button in Profile / sidebar uses it
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
