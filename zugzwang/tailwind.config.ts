import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#1c1a17",
          deep: "#161512",
          raised: "#262522",
        },
        earth: {
          DEFAULT: "#21201d",
          card: "#302e2b",
          hover: "#454340",
          line: "#3d3b38",
        },
        accent: {
          DEFAULT: "#81b64c",
          bright: "#9bce5a",
          dim: "#6a9a3e",
        },
        board: {
          light: "#eeeed2",
          dark: "#779556",
          highlight: "#f6f669",
          lastmove: "#baca44",
        },
        ivory: "#f1f1f1",
        muted: "#a3a29f",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
