import { ImageResponse } from "next/og";

// Social share card (og:image / twitter:image). Generated at request time so
// there's no binary asset to maintain; Next wires the meta tags automatically.
export const runtime = "edge";
export const alt = "DHH Heardle — guess the Desi Hip Hop track from 1 second";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette mirrors tailwind.config.ts (can't import it here — edge bundle).
const INK = "#0D0D10";
const PAPER = "#F2F1EE";
const SMOKE = "#6F6D75";
const ACCENT = "#C6FB45";

// Static waveform silhouette, same layered-sine trick as Player.tsx.
const BARS = Array.from({ length: 48 }, (_, i) => {
  const v =
    Math.sin(i * 0.7) * 0.5 +
    Math.sin(i * 1.9 + 1.3) * 0.3 +
    Math.sin(i * 0.3 + 0.6) * 0.2;
  return 0.35 + (v * 0.5 + 0.5) * 0.55;
});

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: INK,
          gap: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            height: 140,
          }}
        >
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: `${h * 100}%`,
                borderRadius: 999,
                backgroundColor: i < 14 ? ACCENT : "rgba(242,241,238,0.22)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: -3,
            color: PAPER,
            textTransform: "uppercase",
          }}
        >
          DHH Heardle
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 38, color: SMOKE }}>
            Guess the Desi Hip Hop track from
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: INK,
              backgroundColor: ACCENT,
              padding: "2px 18px",
              borderRadius: 6,
            }}
          >
            1 second
          </div>
        </div>
        <div style={{ fontSize: 28, color: SMOKE, marginTop: 8 }}>
          New puzzle daily · 5 attempts
        </div>
      </div>
    ),
    size,
  );
}
