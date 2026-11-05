"use client";
// Keeps the browser's "install app" event so a button can use it later, anywhere in the app.
export type InstallEvent = Event & { prompt: () => Promise<void> };
type W = Window & { __installEvt?: InstallEvent | null };

const w = () => window as W;
export const getInstallEvent = () => w().__installEvt ?? null;
export const setInstallEvent = (e: InstallEvent | null) => {
  w().__installEvt = e;
  window.dispatchEvent(new Event("pwa-install-change"));
};
export const subscribeInstall = (cb: () => void) => {
  window.addEventListener("pwa-install-change", cb);
  return () => window.removeEventListener("pwa-install-change", cb);
};
export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
