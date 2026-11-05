import { ImageResponse } from "next/og";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4B1FA8",
          color: "#FFD23F",
          fontSize: px * 0.55,
          fontWeight: 900,
        }}
      >
        CM
      </div>
    ),
    { width: px, height: px },
  );
}
