import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D0D10", // charcoal background
        paper: "#F2F1EE", // primary text
        sindoor: "#E8624A", // wrong state (warm red)
        amber: "#E9A23B", // right-artist (unchanged)
        smoke: "#6F6D75", // muted text
        leaf: "#57D178", // correct — brightened to sit in the neon palette
        accent: "#C6FB45", // electric lime, the one glow color
      },
      fontFamily: {
        display: ["var(--font-devanagari)", "serif"],
        sans: ["var(--font-grotesk)", "system-ui", "sans-serif"],
        condensed: ["var(--font-condensed)", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
