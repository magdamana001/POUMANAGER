import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./core/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Color de acento controlado por el panel de admin (CSS var)
        brand: {
          DEFAULT: "var(--brand-color, #e11d48)",
          soft: "color-mix(in srgb, var(--brand-color, #e11d48) 12%, transparent)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
