import type { Config } from "tailwindcss";
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    primary: "var(--primary)", "primary-light": "var(--primary-light)", secondary: "var(--secondary)", accent: "var(--accent)",
    bg: "var(--background)", surface: "var(--surface)", text: "var(--text)", muted: "var(--muted)", border: "var(--border)",
    success: "var(--success)", warning: "var(--warning)", error: "var(--error)", info: "var(--info)" },
    borderRadius: { card: "1rem" }, boxShadow: { card: "0 1px 2px rgba(20,40,30,.06), 0 4px 16px rgba(20,40,30,.06)" } } },
} satisfies Config;
