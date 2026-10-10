"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const t = localStorage.getItem("dibora_theme"); const d = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; setDark(d); document.documentElement.dataset.theme = d ? "dark" : "light"; document.documentElement.style.colorScheme = d ? "dark" : "light"; }, []);
  return <button type="button" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark} title={dark ? "Light theme" : "Dark theme"} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl p-2 transition-colors hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => { const d = !dark; setDark(d); document.documentElement.dataset.theme = d ? "dark" : "light"; document.documentElement.style.colorScheme = d ? "dark" : "light"; localStorage.setItem("dibora_theme", d ? "dark" : "light"); }}>{dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}</button>;
}
export function LocaleSwitch() {
  const { state, update } = useStore();
  useEffect(() => { document.documentElement.lang = state.settings.locale === "am" ? "am" : state.settings.locale === "om" ? "om" : "en"; }, [state.settings.locale]);
  return <select aria-label="Language" value={state.settings.locale} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, locale: e.target.value as "en" | "am" | "om" } }))} className="min-h-[44px] w-[116px] shrink-0 rounded-xl border border-border bg-surface px-2 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary sm:w-auto">
    <option value="en">English</option><option value="am">አማርኛ</option><option value="om">Afaan Oromoo</option></select>;
}
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Dibora";
