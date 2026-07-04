import type { Config } from "tailwindcss";

// Cassette theme (risograph zine): token NAMES keep their semantic roles
// (ink = background, paper = text) so components restyle without churn — only
// the values changed. Deep-indigo ground, loud riso inks, near-black outlines.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#211E52", // deep indigo ground (backgrounds)
        paper: "#F4EEDD", // riso paper-white (primary text)
        night: "#0E0B2A", // near-black outline + hard-shadow ink
        sindoor: "#F0294A", // wrong state (riso red)
        amber: "#FF9E1B", // right-artist / skip (riso orange-gold)
        smoke: "#9A95C8", // muted text (faded lavender print)
        leaf: "#00B761", // correct (riso green)
        accent: "#FF3DA5", // riso hot-pink — the interactive color
        cyan: "#12C2E9", // riso aqua — secondary loud accent
        tangerine: "#FF6A1A", // riso orange — secondary loud accent
      },
      fontFamily: {
        display: ["var(--font-devanagari)", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        condensed: ["var(--font-condensed)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
