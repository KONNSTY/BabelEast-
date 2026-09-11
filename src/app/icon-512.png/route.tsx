import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#00A3FF",
          borderRadius: 104,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 276,
            fontWeight: 800,
            color: "#FFFFFF",
          }}
        >
          lf
        </div>
      </div>
    ),
    { ...size },
  );
}
