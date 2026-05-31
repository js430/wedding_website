import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          blush: "#FEE8EC",
          soft: "#FFB3C4",
          deep: "#CC1428",
        },
        crimson: {
          dark: "#8B0010",
          darkest: "#1E0008",
        },
        gold: "#c9a838",
        ivory: "#FEE8EC",
        bark: "#1E0008",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-lato)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "floral-pattern": "url('/floral-bg.svg')",
      },
    },
  },
  plugins: [],
};

export default config;
