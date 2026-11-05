/** Client-safe Premium helpers. Premium never affects challenges or trending. */
export const FRAMES: Record<string, { label: string; cls: string }> = {
  gold: { label: "Gold", cls: "ring-4 ring-yellow-400" },
  purple: { label: "Purple", cls: "ring-4 ring-purple-500" },
  green: { label: "Green", cls: "ring-4 ring-green-500" },
  fire: { label: "Fire", cls: "ring-4 ring-orange-500" },
};

export const ALIAS_STYLES: Record<string, { label: string; cls: string }> = {
  gold: { label: "Gold", cls: "text-yellow-600" },
  rainbow: { label: "Rainbow", cls: "bg-gradient-to-r from-pink-500 via-yellow-500 to-green-500 bg-clip-text text-transparent" },
  fire: { label: "Fire", cls: "text-orange-600" },
};

/** Extra meme fonts for Premium (system fonts only: nothing to download on slow phones). */
export const PREMIUM_FONTS: { label: string; family: string }[] = [
  { label: "Comic", family: "'Comic Sans MS', 'Chalkboard SE', cursive" },
  { label: "Serif", family: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", family: "'Courier New', monospace" },
];
export const DEFAULT_FONT = "Impact, 'Arial Black', sans-serif";

export function isPremiumNow(p: { is_premium?: boolean | null; premium_until?: string | null } | null | undefined) {
  return !!p?.is_premium && !!p.premium_until && new Date(p.premium_until).getTime() > Date.now();
}
