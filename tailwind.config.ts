import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ── CSS variable aliases (existing pattern preserved) ──────
        bg:           "var(--bg)",
        surface:      "var(--surface)",
        text:         "var(--text)",
        muted:        "var(--text-muted)",
        border:       "var(--border)",
        divider:      "var(--divider)",
        accent:       "var(--accent)",
        accentHover:  "var(--accent-hover)",
        accentActive: "var(--accent-active)",
        success:      "var(--success)",
        warning:      "var(--warning)",
        error:        "var(--error)",
        primaryBtn:       "var(--primary-btn)",
        primaryBtnHover:  "var(--primary-btn-hover)",
        primaryBtnActive: "var(--primary-btn-active)",

        // ── Brand palette — direct values ──────────────────────────
        coral:  "#fe9f9f",
        blue:   "#6366f1",
        amber:  "#fdc683",

        // ── Extended tints — for hover states, backgrounds ─────────
        "coral-10":  "rgba(254,159,159,0.10)",
        "coral-12":  "rgba(254,159,159,0.12)",
        "blue-5":    "rgba(99,102,241,0.05)",
        "blue-8":    "rgba(99,102,241,0.08)",
        "blue-16":   "rgba(99,102,241,0.16)",
        "amber-15":  "rgba(253,198,131,0.15)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-sm)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0,0,0.2,1)",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        220: "220ms",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],
        "xs":  ["0.75rem",   { lineHeight: "1.4",  letterSpacing: "0.01em" }],
        "sm":  ["0.875rem",  { lineHeight: "1.5",  letterSpacing: "0.005em" }],
        "base":["1rem",      { lineHeight: "1.6" }],
        "lg":  ["1.125rem",  { lineHeight: "1.5",  letterSpacing: "-0.01em" }],
        "xl":  ["1.25rem",   { lineHeight: "1.4",  letterSpacing: "-0.015em" }],
        "2xl": ["1.5rem",    { lineHeight: "1.3",  letterSpacing: "-0.02em" }],
      },
    }
  },
  plugins: []
};

export default config;
