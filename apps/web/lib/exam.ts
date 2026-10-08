import type { ScorableQuestion } from "@dibora/core/exam-scoring";
import { QUESTIONS, EXAMS, type Question } from "./mock";
export const toScorable = (q: Question): ScorableQuestion => ({ id: q.id, topicId: q.topicId, difficulty: q.difficulty, type: q.type, marks: 1, correctOptionId: q.correctOptionId, numericAnswer: q.numericAnswer, numericTolerance: q.tolerance ?? 0 });
export const getQ = (id: string) => QUESTIONS.find((q) => q.id === id);
export const getExam = (id: string) => EXAMS.find((e) => e.id === id);
export const correctText = (q: Question) => q.type === "NUMERICAL" ? String(q.numericAnswer) : q.options.find((o) => o.id === q.correctOptionId)?.text ?? "";
export const fmtTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
export const uid = () => crypto.randomUUID();
