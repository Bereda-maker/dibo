import type { Difficulty, QuestionType } from "@dibora/types";

export type ScorableQuestion = {
  id: string; topicId: string; difficulty: Difficulty; type: QuestionType; marks: number;
  correctOptionId?: string | null; numericAnswer?: number | null; numericTolerance?: number;
};
export type SubmittedAnswer = { questionId: string; selectedOptionId?: string | null; numericAnswer?: number | null; timeSpentSeconds?: number };
export type Bucket = { total: number; correct: number; accuracy: number };
export type QuestionOutcome = { questionId: string; status: "CORRECT" | "INCORRECT" | "UNANSWERED"; awarded: number };

export type ScoreResult = {
  score: number; maxScore: number; percentage: number;
  correct: number; incorrect: number; unanswered: number; timeUsedSeconds: number;
  byTopic: Record<string, Bucket>; byDifficulty: Record<string, Bucket>;
  outcomes: QuestionOutcome[]; passed: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const bucket = (b: { total: number; correct: number }): Bucket => ({ ...b, accuracy: b.total ? round1((b.correct / b.total) * 100) : 0 });

export function isCorrect(q: ScorableQuestion, a?: SubmittedAnswer): boolean | null {
  if (!a) return null;
  if (q.type === "NUMERICAL") {
    if (a.numericAnswer == null || !Number.isFinite(a.numericAnswer) || q.numericAnswer == null) return a.numericAnswer == null ? null : false;
    return Math.abs(a.numericAnswer - q.numericAnswer) <= (q.numericTolerance ?? 0) + Number.EPSILON;
  }
  if (!a.selectedOptionId) return null;
  return a.selectedOptionId === q.correctOptionId;
}

/** Pure and deterministic: the server scores from stored answers; client-sent correctness is never used. */
export function scoreExam(questions: ScorableQuestion[], answers: SubmittedAnswer[], passingPercent = 50): ScoreResult {
  const byQ = new Map<string, SubmittedAnswer>();
  for (const a of answers) byQ.set(a.questionId, a); // last write wins; unknown ids are ignored below

  let score = 0, maxScore = 0, correct = 0, incorrect = 0, unanswered = 0, time = 0;
  const topics: Record<string, { total: number; correct: number }> = {};
  const diffs: Record<string, { total: number; correct: number }> = {};
  const outcomes: QuestionOutcome[] = [];

  for (const q of questions) {
    maxScore += q.marks;
    const t = (topics[q.topicId] ??= { total: 0, correct: 0 });
    const d = (diffs[q.difficulty] ??= { total: 0, correct: 0 });
    t.total++; d.total++;
    const ans = byQ.get(q.id);
    time += Math.max(0, ans?.timeSpentSeconds ?? 0);
    const r = isCorrect(q, ans);
    if (r === null) { unanswered++; outcomes.push({ questionId: q.id, status: "UNANSWERED", awarded: 0 }); }
    else if (r) { correct++; score += q.marks; t.correct++; d.correct++; outcomes.push({ questionId: q.id, status: "CORRECT", awarded: q.marks }); }
    else { incorrect++; outcomes.push({ questionId: q.id, status: "INCORRECT", awarded: 0 }); }
  }
  const percentage = maxScore ? round1((score / maxScore) * 100) : 0;
  return {
    score, maxScore, percentage, correct, incorrect, unanswered, timeUsedSeconds: time,
    byTopic: Object.fromEntries(Object.entries(topics).map(([k, v]) => [k, bucket(v)])),
    byDifficulty: Object.fromEntries(Object.entries(diffs).map(([k, v]) => [k, bucket(v)])),
    outcomes, passed: percentage >= passingPercent,
  };
}

/** Timer rule used on submit: answers arriving after deadline + grace are rejected. */
export function isWithinDeadline(deadline: Date, now: Date, graceSeconds = 10) {
  return now.getTime() <= deadline.getTime() + graceSeconds * 1000;
}
