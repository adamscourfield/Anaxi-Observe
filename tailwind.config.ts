import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        border: "var(--border)",
        divider: "var(--divider)",
        accent: "var(--accent)",
        accentHover: "var(--accent-hover)",
        accentActive: "var(--accent-active)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        primaryBtn: "var(--primary-btn)",
        primaryBtnHover: "var(--primary-btn-hover)",
        primaryBtnActive: "var(--primary-btn-active)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-sm)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        220: "220ms",
      },
    }
  },
  plugins: []
};

export default config;
