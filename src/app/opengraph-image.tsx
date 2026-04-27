import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Drav – Talk to multiple AI at once";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div style={{ fontSize: 96, lineHeight: 1 }}>▲▼</div>
          <div style={{ fontSize: 160, fontWeight: 600, letterSpacing: -4 }}>
            DRAV
          </div>
        </div>
        <div
          style={{
            fontSize: 44,
            color: "#fafafa",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Talk to multiple AI at once.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#a3a3a3",
            marginTop: 40,
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Compare OpenAI, Anthropic, and Gemini side-by-side — or chain them in
          a visual workflow builder.
        </div>
      </div>
    ),
    { ...size }
  );
}
