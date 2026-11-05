/** Load an image; crossOrigin lets the canvas export it later. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Shrink a user's photo to at most `max` px wide and re-encode as JPEG to save data. */
export async function compressPhoto(file: File, max = 1080): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Encoded meme image: WebP when the browser can make it (much smaller), else JPEG. */
export type Encoded = { blob: Blob; ext: "webp" | "jpg"; type: string };

/** `render` returns a data URL for the given mime type (e.g. the Konva stage export). */
export async function encodeSmall(render: (mime: string) => string): Promise<Encoded> {
  const webp = render("image/webp");
  if (webp.startsWith("data:image/webp")) return { blob: await dataUrlToBlob(webp), ext: "webp", type: "image/webp" };
  // Safari and some older browsers silently return PNG for WebP: fall back to JPEG.
  return { blob: await dataUrlToBlob(render("image/jpeg")), ext: "jpg", type: "image/jpeg" };
}
