/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#f17868", foreground: "#102139" },
        secondary: { DEFAULT: "#e7ddc8", foreground: "#102139" },
        accent: { DEFAULT: "#f17868", foreground: "#102139" },
        background: "#102139",
        foreground: "#fffaf0",
        card: { DEFAULT: "rgba(255, 250, 240, 0.08)", foreground: "#fffaf0" },
        muted: { DEFAULT: "rgba(255, 250, 240, 0.10)", foreground: "#d7d2c7" },
        border: "rgba(255, 250, 240, 0.18)",
        ring: "#f17868",
        destructive: { DEFAULT: "#e66767", foreground: "#102139" },
        success: "#199e70",
        warning: "#c98500",
      },
      fontFamily: {
        sans: ["Fira Sans", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "0.875rem",
        md: "0.625rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};
