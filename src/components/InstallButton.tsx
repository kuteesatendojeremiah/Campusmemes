"use client";
import { useState, useSyncExternalStore } from "react";
import { getInstallEvent, isInstalled, setInstallEvent, subscribeInstall } from "./install-store";

/** "Install app" row. Uses the real install prompt when the browser offers it, else shows how to do it by hand. */
export default function InstallButton({ className }: { className: string }) {
  const evt = useSyncExternalStore(subscribeInstall, getInstallEvent, () => null);
  const installed = useSyncExternalStore(subscribeInstall, isInstalled, () => false);
  const [help, setHelp] = useState(false);
  if (installed) return null;

  return (
    <>
      <button
        className={className}
        onClick={async () => {
          if (!evt) return setHelp((h) => !h);
          await evt.prompt();
          setInstallEvent(null);
        }}
      >
        <span>📲 Install CampusMemes</span>
        <span className="text-xs text-gray-500">{evt ? "Add to home screen" : "How?"}</span>
      </button>
      {help && !evt && (
        <p className="rounded-lg bg-lilac p-3 text-xs text-gray-700">
          Android Chrome: menu ⋮ → Add to Home screen. iPhone Safari: Share → Add to Home Screen. Computer: use the install icon in the address bar.
        </p>
      )}
    </>
  );
}
