"use client";

import en from "../i18n/en.json"; import am from "../i18n/am.json"; import om from "../i18n/om.json";
import { useStore } from "./store";
const dict: Record<string, Record<string, string>> = { en, am, om };
const nav: Record<string, Record<string, string>> = {
  en: { dashboard: "Dashboard", notes: "Notes", practice: "Practice", exams: "Exams", assistant: "AI Assistant", progress: "Progress", more: "More" },
  am: { dashboard: "ዳሽቦርድ", notes: "ማስታወሻዎች", practice: "ልምምድ", exams: "ፈተናዎች", assistant: "የAI ረዳት", progress: "እድገት", more: "ተጨማሪ" },
  om: { dashboard: "Dashboordii", notes: "Yaadannoo", practice: "Shaakala", exams: "Qormaata", assistant: "Gargaaraa AI", progress: "Guddina", more: "Dabalataa" },
};
export function useT() {
  const { state } = useStore(); const l = state.settings.locale;
  return (key: string) => dict[l]?.[key] ?? nav[l]?.[key] ?? (dict.en as Record<string, string>)[key] ?? nav.en![key] ?? key;
}
