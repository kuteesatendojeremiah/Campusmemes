const ADJ = ["Sleepy", "Broke", "Hungry", "Retake", "Dead", "Late", "Lost", "Sneaky", "Tired", "Caffeinated", "Chilled", "Dramatic", "Clueless", "Midnight", "Savage"];
const NOUN = ["Rolex", "King", "Queen", "Scholar", "Boda", "Matooke", "Fresher", "Hustler", "Panda", "Lion", "Legend", "Ninja", "Chapati", "Nerd", "Rider"];
export const AVATARS = ["😎", "🤪", "😴", "🥴", "🤓", "😤", "🦁", "🐼", "🐸", "🦊", "🐵", "👻", "🤡", "🥶", "🫠", "🤠"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomAlias() {
  return `@${pick(ADJ)}${pick(NOUN)}${Math.floor(Math.random() * 90 + 10)}`;
}
export const randomAvatar = () => pick(AVATARS);

/** Normalise Ugandan numbers to +256XXXXXXXXX. Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/[\s()-]/g, "");
  let n: string;
  if (/^\+256\d{9}$/.test(d)) n = d;
  else if (/^256\d{9}$/.test(d)) n = "+" + d;
  else if (/^0\d{9}$/.test(d)) n = "+256" + d.slice(1);
  else return null;
  return n;
}

/** Canonical email used for the private identity/ban list: lower-case, no +tags, no dots for gmail. */
export function normalizeEmail(input: string): string {
  const [rawLocal = "", rawDomain = ""] = input.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}
