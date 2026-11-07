import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FBF9F5",
          sunken: "#F2ECE1",
        },
        surface: "#FFFFFF",
        line: "#E6E0D4",
        ink: {
          DEFAULT: "#141312",
          muted: "#59534B",
        },
        group: {
          hiburan: "#C2410C",
          pelajaran: "#1D4ED8",
        },
        status: {
          tersedia: "#15803D",
          dipinjam: "#B45309",
        },
        danger: "#B91C1C",
        "on-group": "#FFFFFF",
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
