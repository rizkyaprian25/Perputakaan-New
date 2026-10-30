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
          DEFAULT: "#F5F0E6",
          sunken: "#EBE4D5",
        },
        surface: "#FFFDF8",
        line: "#D6CDB9",
        ink: {
          DEFAULT: "#1C1A17",
          muted: "#5A554B",
        },
        group: {
          hiburan: "#B8381A",
          pelajaran: "#1F3FA8",
        },
        status: {
          tersedia: "#2F6B3A",
          dipinjam: "#8A5A00",
        },
        danger: "#A3201B",
        "on-group": "#FFFFFF",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-ibm-plex-sans)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
