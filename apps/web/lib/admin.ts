"use client";
import { useCallback, useEffect, useState } from "react";
import { QUESTIONS, EXAMS, SUBJECTS, TOPICS, NOTES, type Question } from "./mock";
import { useStore } from "./store";
export type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type Student = { id: string; name: string; region: string; grade: number; learning: string; plan: string; accuracy: number; readiness: number; active: boolean; joined: string };
export type AdminData = { questions: (Question & { status: Status })[]; exams: { id: string; title: string; type: string; minutes: number; count: number; status: Status; premium: boolean }[]; subjects: { id: string; name: string; status: Status }[]; topics: { id: string; name: string; subjectId: string; status: Status }[]; notes: { id: string; title: string; status: Status }[]; students: Student[] };
const names = ["Selam Tadesse", "Dawit Mekonnen", "Hana Bekele", "Yonas Kebede", "Meron Alemu", "Biruk Assefa", "Liya Girma", "Nahom Tesfaye"], regs = ["Addis Ababa", "Oromia", "Amhara", "Sidama", "Tigray", "Dire Dawa", "Oromia", "Amhara"], st = ["ACTIVE_LEARNER", "EXAM_PREPARATION", "DIAGNOSTIC_PENDING", "READY_FOR_MOCK", "ACTIVE_LEARNER", "REGISTERED", "EXAM_PREPARATION", "ACTIVE_LEARNER"];
const seed = (): AdminData => ({
  questions: QUESTIONS.map((q, i) => ({ ...q, status: i < 20 ? "PUBLISHED" : "DRAFT" })), exams: EXAMS.map((e) => ({ id: e.id, title: e.title, type: e.type, minutes: e.minutes, count: e.questionIds.length, status: "PUBLISHED", premium: e.premium })),
  subjects: SUBJECTS.map((s) => ({ id: s.id, name: s.name, status: "PUBLISHED" })), topics: TOPICS.map((t) => ({ ...t, status: "PUBLISHED" })), notes: NOTES.map((n) => ({ id: n.id, title: n.title, status: "PUBLISHED" })),
  students: names.map((n, i) => ({ id: "s" + i, name: n, region: regs[i]!, grade: 12, learning: st[i]!, plan: i % 3 === 0 ? "PREMIUM" : "FREE", accuracy: 48 + ((i * 11) % 40), readiness: 40 + ((i * 13) % 45), active: i !== 5, joined: `2026-0${(i % 6) + 3}-1${i}` })),
});
const KEY = "dibora_admin_v1";
export function useAdmin() {
  const { update } = useStore(); const [d, setD] = useState<AdminData | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(KEY); setD(raw ? JSON.parse(raw) : seed()); } catch { setD(seed()); } }, []);
  const set = useCallback((fn: (d: AdminData) => AdminData, audit?: string) => {
    setD((p) => { const n = fn(p ?? seed()); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
    if (audit) update((s) => ({ ...s, audit: [{ at: new Date().toISOString(), action: audit }, ...s.audit].slice(0, 200) }));
  }, [update]);
  return { d, set };
}
