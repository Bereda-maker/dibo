"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const t = localStorage.getItem("dibora_theme"); const d = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; setDark(d); document.documentElement.dataset.theme = d ? "dark" : "light"; }, []);
  return <button aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="rounded-xl p-2 hover:bg-border/50 min-h-[44px] min-w-[44px] grid place-items-center"
    onClick={() => { const d = !dark; setDark(d); document.documentElement.dataset.theme = d ? "dark" : "light"; localStorage.setItem("dibora_theme", d ? "dark" : "light"); }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}
export function LocaleSwitch() {
  const { state, update } = useStore();
  return <select aria-label="Language" value={state.settings.locale} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, locale: e.target.value as "en" | "am" | "om" } }))} className="min-h-[44px] w-[116px] shrink-0 rounded-xl border border-border bg-surface px-2 py-2 text-sm shadow-sm sm:w-auto">
    <option value="en">English</option><option value="am">አማርኛ</option><option value="om">Afaan Oromoo</option></select>;
}
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Dibora";
