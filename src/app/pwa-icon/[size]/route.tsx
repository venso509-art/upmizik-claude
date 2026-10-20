import { ImageResponse } from "next/og";

// "edge": sou Windows, mòd Node la pa jwenn font next/og la ("Invalid URL")
export const runtime = "edge";

// Ikòn app la (192 oswa 512 piksèl), jenere otomatikman: "Up" sou yon fon violèt
export function GET(_req: Request, { params }: { params: { size: string } }) {
  const size = params.size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #d946ef, #7c3aed)",
          color: "white",
          fontSize: size * 0.38,
          fontWeight: 900,
          letterSpacing: -size * 0.02,
        }}
      >
        Up
      </div>
    ),
    { width: size, height: size },
  );
}
