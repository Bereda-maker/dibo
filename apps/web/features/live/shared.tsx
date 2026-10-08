"use client";
import { ErrorState, Skeleton } from "../../components/ui";
import { ApiError } from "../../lib/api";
export type TopicStat = { topicId: string; topicName: string; subjectName: string; attempted: number; correct: number; recentAttempted: number; recentCorrect: number; daysSincePracticed: number | null };
export type ProgressData = { questionsAttempted: number; questionsCorrect: number; accuracy: number | null; streak: number; longestStreak: number; points: number; readiness: { overall: number; parts: Record<string, number>; disclaimer: string }; topics: TopicStat[] };
export type Rec = { topicId: string; priority: "HIGH" | "MEDIUM" | "LOW"; action: "PRACTICE" | "READ_NOTE"; difficulty: "EASY" | "MEDIUM" | "HARD"; questionCount: number; reason: string };
/** Standard loading / error / retry wrapper for live screens. */
export function Async<T>({ q, children, rows = 3 }: { q: { data: T | null; error: Error | null; loading: boolean; reload: () => void }; children: (d: T) => React.ReactNode; rows?: number }) {
  if (q.error) return <ErrorState message={q.error instanceof ApiError ? q.error.message : "Could not load this page."} onRetry={q.reload} />;
  if (q.loading || !q.data) return <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  return <>{children(q.data)}</>;
}
export const pct = (c: number, a: number) => (a ? Math.round((c / a) * 100) : null);
export const diffTone = (d: string) => (d === "HARD" ? "error" : d === "MEDIUM" ? "warning" : "success") as "error" | "warning" | "success";
