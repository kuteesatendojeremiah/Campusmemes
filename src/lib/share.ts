import { loadImage } from "./image";

/** Draw a small CampusMemes watermark in the bottom-right corner and return a JPEG blob. */
async function watermarked(imageUrl: string): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const fs = Math.max(14, Math.round(c.width / 28));
  ctx.font = `bold ${fs}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = fs / 6;
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.fillStyle = "#FFD23F";
  const pad = fs * 0.6;
  ctx.strokeText("CampusMemes", c.width - pad, c.height - pad);
  ctx.fillText("CampusMemes", c.width - pad, c.height - pad);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.88));
}

/**
 * Share the watermarked meme image where the browser allows it (Android Chrome);
 * otherwise open WhatsApp with the meme's page link. Returns true if something was shared/opened.
 */
export async function shareToWhatsApp(meme: { id: string; image_url: string }): Promise<boolean> {
  const link = `${location.origin}/m/${meme.id}`;
  const text = `😂 Shared from CampusMemes — student-life memes, no real names.
Laugh & make your own: ${link}`;
  try {
    const blob = await watermarked(meme.image_url);
    const file = new File([blob], "campusmeme.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return false; // user closed the share sheet
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return true;
}
