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
          blush: "#fdecea",
          soft: "#e05252",
          deep: "#991b1b",
        },
        gold: "#c9a838",
        ivory: "#fff8f0",
        bark: "#4a3728",
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
