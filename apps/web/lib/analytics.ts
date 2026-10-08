import { QUESTIONS, TOPICS, SUBJECTS, subjectName, topicName } from "./mock";
import type { State } from "./store";
import type { TopicStat } from "@dibora/core/recommendation";
import { computeReadiness } from "@dibora/core/readiness";

type Ev = { topicId: string; correct: boolean; at: number };
export function events(s: State): Ev[] {
  const ev: Ev[] = s.practice.map((p) => ({ topicId: p.topicId, correct: p.correct, at: Date.parse(p.at) }));
  for (const a of s.attempts) for (const o of a.result.outcomes) {
    if (o.status === "UNANSWERED") continue;
    const q = QUESTIONS.find((x) => x.id === o.questionId); if (q) ev.push({ topicId: q.topicId, correct: o.status === "CORRECT", at: Date.parse(a.submittedAt) });
  }
  return ev.sort((a, b) => a.at - b.at);
}
export function topicStats(s: State): TopicStat[] {
  const ev = events(s); const now = Date.now();
  return TOPICS.filter((t) => !s.user || s.user.subjects.includes(t.subjectId)).map((t) => {
    const mine = ev.filter((e) => e.topicId === t.id), recent = mine.slice(-20);
    const last = mine.at(-1);
    return { topicId: t.id, topicName: t.name, subjectName: subjectName(t.subjectId), attempted: mine.length, correct: mine.filter((e) => e.correct).length,
      recentAttempted: recent.length, recentCorrect: recent.filter((e) => e.correct).length, noteCompleted: false, daysSincePracticed: last ? Math.floor((now - last.at) / 864e5) : null };
  }).map((st) => ({ ...st, noteCompleted: s.notesDone.some((n) => n.endsWith(st.topicId) || n === `n-${st.topicId}`) }));
}
export const acc = (a: number, c: number) => (a ? Math.round((c / a) * 100) : null);
export function subjectStats(s: State) {
  const ts = topicStats(s);
  return SUBJECTS.filter((x) => !s.user || s.user.subjects.includes(x.id)).map((sub) => {
    const mine = ts.filter((t) => TOPICS.find((x) => x.id === t.topicId)?.subjectId === sub.id);
    const a = mine.reduce((n, t) => n + t.attempted, 0), c = mine.reduce((n, t) => n + t.correct, 0);
    return { ...sub, attempted: a, accuracy: acc(a, c) };
  });
}
export function streak(days: string[]) {
  const set = new Set(days); let n = 0; const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1); // today not yet studied does not break the streak
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function readinessFor(s: State, asOf = Date.now()) {
  const ev = events(s).filter((e) => e.at <= asOf);
  const all = acc(ev.length, ev.filter((e) => e.correct).length) ?? 0;
  const r = ev.slice(-30); const rec = acc(r.length, r.filter((e) => e.correct).length) ?? 0;
  const mocks = s.attempts.filter((a) => a.type === "MOCK" && Date.parse(a.submittedAt) <= asOf);
  const mockAvg = mocks.length ? Math.round(mocks.reduce((n, a) => n + a.result.percentage, 0) / mocks.length) : null;
  const cutoff = asOf - 14 * 864e5;
  const active = s.days.filter((d) => Date.parse(d) > cutoff && Date.parse(d) <= asOf).length;
  return computeReadiness({ knowledgeAccuracy: all, practiceAccuracy: rec, mockAverage: mockAvg, activeDaysLast14: active });
}
export function points(s: State) { return s.practice.filter((p) => p.correct).length * 10 + s.attempts.reduce((n, a) => n + Math.round(a.result.percentage), 0); }
export function unlocked(s: State) {
  const qs = events(s).length, best = Math.max(0, ...s.attempts.map((a) => a.result.percentage)), st = streak(s.days);
  const mastery = topicStats(s).some((t) => t.attempted >= 20 && t.correct / t.attempted >= 0.9);
  return new Set([qs >= 100 && "Q100", qs >= 500 && "Q500", s.attempts.length > 0 && "FIRST_EXAM", st >= 7 && "S7", st >= 30 && "S30", best >= 90 && "E90", s.attempts.some((a) => a.type === "MOCK") && "MOCK", mastery && "MASTERY"].filter(Boolean) as string[]);
}
export const questionsToday = (s: State) => s.practice.filter((p) => p.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
export { topicName };
