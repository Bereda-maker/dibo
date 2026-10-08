"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ScoreResult, SubmittedAnswer } from "@dibora/core/exam-scoring";
import { DEFAULT_PLANS, type Plan } from "./mock";

export type User = { name: string; email: string; phone: string; school: string; region: string; city: string; grade: number; stream: string; examYear: number; subjects: string[]; role: "STUDENT" | "ADMIN"; plan: "FREE" | "PREMIUM"; leaderboardOptIn: boolean; learningStatus: string };
export type Attempt = { id: string; examId: string; title: string; type: string; submittedAt: string; result: ScoreResult; answers: SubmittedAnswer[]; order: string[] };
export type InProgress = { startedAt: number; deadline: number; order: string[]; answers: Record<string, SubmittedAnswer>; flagged: string[]; index: number };
export type PracticeEntry = { qid: string; topicId: string; correct: boolean; at: string };
export type ChatMsg = { role: "user" | "assistant"; content: string; sources?: string[] };
export type Conversation = { id: string; title: string; messages: ChatMsg[] };
export type State = {
  user: User | null; attempts: Attempt[]; inProgress: Record<string, InProgress>; practice: PracticeEntry[];
  bookmarks: { type: "NOTE" | "QUESTION" | "TOPIC"; id: string }[]; notesDone: string[]; days: string[]; readNotifs: string[];
  conversations: Conversation[]; aiUsage: Record<string, number>; recentSearches: string[]; plans: Plan[]; audit: { at: string; action: string }[];
  settings: { locale: "en" | "am" | "om" };
};
const KEY = "dibora_state_v1";
const empty: State = { user: null, attempts: [], inProgress: {}, practice: [], bookmarks: [], notesDone: [], days: [], readNotifs: [], conversations: [], aiUsage: {}, recentSearches: [], plans: DEFAULT_PLANS, audit: [], settings: { locale: "en" } };
export const today = () => new Date().toISOString().slice(0, 10);

type Ctx = { state: State; ready: boolean; update: (fn: (s: State) => State) => void; markActive: () => void; logout: () => void };
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setState({ ...empty, ...JSON.parse(raw) }); } catch { /* corrupt storage: start fresh */ }
    setReady(true);
  }, []);
  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => { const next = fn(prev); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ } return next; });
  }, []);
  const markActive = useCallback(() => update((s) => (s.days.includes(today()) ? s : { ...s, days: [...s.days, today()] })), [update]);
  const logout = useCallback(() => update((s) => ({ ...s, user: null })), [update]);
  const value = useMemo(() => ({ state, ready, update, markActive, logout }), [state, ready, update, markActive, logout]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useStore() { const c = useContext(C); if (!c) throw new Error("StoreProvider missing"); return c; }
