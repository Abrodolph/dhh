import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121010",
        paper: "#F2EDE3",
        sindoor: "#E8402A",
        amber: "#E9A23B",
        smoke: "#7A716A",
        leaf: "#5FA86B",
      },
      fontFamily: {
        display: ["var(--font-devanagari)", "serif"],
        sans: ["var(--font-grotesk)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
