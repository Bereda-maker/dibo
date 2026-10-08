import { describe, expect, test } from "bun:test";
import { scoreExam, isWithinDeadline, type ScorableQuestion } from "../src/services/exam-scoring.service";

const Q: ScorableQuestion[] = [
  { id: "q1", topicId: "algebra", difficulty: "EASY", type: "MULTIPLE_CHOICE", marks: 1, correctOptionId: "a" },
  { id: "q2", topicId: "algebra", difficulty: "MEDIUM", type: "TRUE_FALSE", marks: 1, correctOptionId: "t" },
  { id: "q3", topicId: "calculus", difficulty: "HARD", type: "NUMERICAL", marks: 2, numericAnswer: 3.14, numericTolerance: 0.01 },
  { id: "q4", topicId: "calculus", difficulty: "MEDIUM", type: "MULTIPLE_CHOICE", marks: 1, correctOptionId: "d" },
];

describe("scoreExam", () => {
  test("scores a perfect attempt", () => {
    const r = scoreExam(Q, [{ questionId: "q1", selectedOptionId: "a" }, { questionId: "q2", selectedOptionId: "t" }, { questionId: "q3", numericAnswer: 3.14 }, { questionId: "q4", selectedOptionId: "d" }]);
    expect(r.score).toBe(5); expect(r.maxScore).toBe(5); expect(r.percentage).toBe(100); expect(r.passed).toBe(true);
  });
  test("separates correct, incorrect and unanswered", () => {
    const r = scoreExam(Q, [{ questionId: "q1", selectedOptionId: "a" }, { questionId: "q2", selectedOptionId: "f" }]);
    expect([r.correct, r.incorrect, r.unanswered]).toEqual([1, 1, 2]);
    expect(r.score).toBe(1); expect(r.percentage).toBe(20);
  });
  test("numerical answers respect tolerance", () => {
    expect(scoreExam([Q[2]!], [{ questionId: "q3", numericAnswer: 3.149 }]).correct).toBe(1);
    expect(scoreExam([Q[2]!], [{ questionId: "q3", numericAnswer: 3.2 }]).incorrect).toBe(1);
  });
  test("weights marks and builds topic/difficulty breakdowns", () => {
    const r = scoreExam(Q, [{ questionId: "q1", selectedOptionId: "a" }, { questionId: "q3", numericAnswer: 3.14 }]);
    expect(r.byTopic.algebra).toEqual({ total: 2, correct: 1, accuracy: 50 });
    expect(r.byTopic.calculus?.correct).toBe(1);
    expect(r.byDifficulty.HARD?.accuracy).toBe(100);
  });
  test("ignores answers for questions not in the exam and uses last duplicate", () => {
    const r = scoreExam([Q[0]!], [{ questionId: "zzz", selectedOptionId: "a" }, { questionId: "q1", selectedOptionId: "b" }, { questionId: "q1", selectedOptionId: "a" }]);
    expect(r.correct).toBe(1); expect(r.outcomes.length).toBe(1);
  });
  test("empty exam does not divide by zero", () => { expect(scoreExam([], []).percentage).toBe(0); });
  test("passing threshold is respected", () => {
    expect(scoreExam([Q[0]!, Q[1]!], [{ questionId: "q1", selectedOptionId: "a" }], 50).passed).toBe(true);
    expect(scoreExam([Q[0]!, Q[1]!], [{ questionId: "q1", selectedOptionId: "a" }], 60).passed).toBe(false);
  });
  test("sums time spent and ignores negatives", () => {
    expect(scoreExam(Q, [{ questionId: "q1", selectedOptionId: "a", timeSpentSeconds: 30 }, { questionId: "q2", timeSpentSeconds: -5 }]).timeUsedSeconds).toBe(30);
  });
});

describe("timer", () => {
  const dl = new Date("2026-01-01T10:00:00Z");
  test("accepts within deadline and grace", () => { expect(isWithinDeadline(dl, new Date("2026-01-01T10:00:05Z"))).toBe(true); });
  test("rejects after grace", () => { expect(isWithinDeadline(dl, new Date("2026-01-01T10:00:30Z"))).toBe(false); });
});
