export type ReadinessInput = {
  knowledgeAccuracy: number;     // 0-100, weighted topic accuracy
  practiceAccuracy: number;      // 0-100, recent practice accuracy
  mockAverage: number | null;    // 0-100, null when no mock taken
  activeDaysLast14: number;      // 0-14
};
export const READINESS_WEIGHTS = { knowledge: 0.35, practice: 0.25, mock: 0.25, consistency: 0.15 } as const;
export const READINESS_DISCLAIMER = "Exam Readiness is an internal learning metric to guide your study. It is not a prediction of your official examination result.";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function computeReadiness(i: ReadinessInput) {
  const consistency = clamp((i.activeDaysLast14 / 10) * 100); // 10 active days in 14 = full marks; rest days are fine
  let w: Record<"knowledge" | "practice" | "mock" | "consistency", number> = { ...READINESS_WEIGHTS };
  if (i.mockAverage == null) { // redistribute mock weight rather than punishing students who haven't reached mocks
    const extra = w.mock; w = { knowledge: w.knowledge + extra * 0.5, practice: w.practice + extra * 0.3, mock: 0, consistency: w.consistency + extra * 0.2 };
  }
  const parts = { knowledge: clamp(i.knowledgeAccuracy), practice: clamp(i.practiceAccuracy), mock: clamp(i.mockAverage ?? 0), consistency };
  const overall = Math.round(parts.knowledge * w.knowledge + parts.practice * w.practice + parts.mock * w.mock + parts.consistency * w.consistency);
  return { overall, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)])), disclaimer: READINESS_DISCLAIMER };
}

export function explainChange(prev: ReturnType<typeof computeReadiness>, next: ReturnType<typeof computeReadiness>) {
  const delta = next.overall - prev.overall;
  const keys = Object.keys(next.parts) as (keyof typeof next.parts)[];
  const top = keys.map((k) => ({ k, d: (next.parts[k] ?? 0) - (prev.parts[k] ?? 0) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const driver = top && top.d !== 0 ? `, mainly because your ${top.k} score ${top.d > 0 ? "rose" : "fell"} by ${Math.abs(top.d)} points` : "";
  return { delta, text: `${delta >= 0 ? "+" : ""}${delta}% this week${driver}.` };
}
