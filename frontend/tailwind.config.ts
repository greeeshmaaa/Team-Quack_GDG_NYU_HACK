import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06070c",
        mist: "#d9e8ff",
        cyan: "#65e0ff",
        azure: "#4ca7ff",
        slateGlow: "#111726",
        glass: "rgba(14, 19, 30, 0.58)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(120, 223, 255, 0.18), 0 20px 80px rgba(14, 90, 255, 0.24)",
        card: "0 20px 60px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        sheet: "2rem",
      },
      fontFamily: {
        sans: ["SF Pro Display", "SF Pro Text", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(137, 182, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(137, 182, 255, 0.08) 1px, transparent 1px)",
      },
      keyframes: {
        pulseRing: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.4" },
          "50%": { transform: "scale(1.08)", opacity: "0.8" },
        },
        breathe: {
          "0%, 100%": { transform: "translateY(0px)", opacity: "0.82" },
          "50%": { transform: "translateY(-6px)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 2.2s ease-in-out infinite",
        breathe: "breathe 5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
