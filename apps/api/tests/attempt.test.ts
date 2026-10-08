import { describe, expect, test } from "bun:test";
import { AttemptService, type AttemptRepo, type ExamForAttempt, type StoredAttempt } from "../src/services/attempt.service";

const exam: ExamForAttempt = { id: "e1", minutes: 10, passing: 50, attemptLimit: 2, requiresPremium: false, randomize: false,
  questions: [{ id: "q1", topicId: "t", difficulty: "EASY", type: "MULTIPLE_CHOICE", marks: 1, correctOptionId: "a" }, { id: "q2", topicId: "t", difficulty: "EASY", type: "MULTIPLE_CHOICE", marks: 1, correctOptionId: "b" }] };

function setup(over: Partial<ExamForAttempt> = {}) {
  let t = new Date("2026-01-01T10:00:00Z"); const store = new Map<string, StoredAttempt>(); let n = 0;
  const e = { ...exam, ...over };
  const repo: AttemptRepo = {
    getExam: async (id) => (id === e.id ? e : null),
    findInProgress: async (s, ex) => [...store.values()].find((a) => a.studentId === s && a.examId === ex && a.status === "IN_PROGRESS") ?? null,
    countAttempts: async (s, ex) => [...store.values()].filter((a) => a.studentId === s && a.examId === ex).length,
    create: async (a) => { const x: StoredAttempt = { id: "a" + ++n, status: "IN_PROGRESS", answers: [], ...a }; store.set(x.id, x); return x; },
    get: async (id, s) => { const a = store.get(id); return a && a.studentId === s ? a : null; },
    upsertAnswers: async (id, ans) => { const a = store.get(id)!; for (const x of ans) a.answers = [...a.answers.filter((y) => y.questionId !== x.questionId), x]; },
    finalize: async (id, status, result) => { const a = store.get(id)!; if (a.status !== "IN_PROGRESS") return false; a.status = status; a.result = result; return true; },
  };
  return { svc: new AttemptService(repo, () => t), advance: (s: number) => { t = new Date(t.getTime() + s * 1000); }, store };
}

describe("attempt flow", () => {
  test("start sets a server-side deadline and resumes instead of duplicating", async () => {
    const { svc } = setup(); const a = await svc.start("s1", "e1", false);
    expect(a.deadlineAt).toBe("2026-01-01T10:10:00.000Z"); await svc.saveAnswers("s1", a.attemptId, [{ questionId: "q1", selectedOptionId: "a" }]);
    const again = await svc.start("s1", "e1", false); expect(again.attemptId).toBe(a.attemptId); expect(again.resumed).toBe(true); expect(again.answers.length).toBe(1);
  });
  test("submit scores from stored answers and is idempotent", async () => {
    const { svc } = setup(); const a = await svc.start("s1", "e1", false);
    await svc.saveAnswers("s1", a.attemptId, [{ questionId: "q1", selectedOptionId: "a" }, { questionId: "q2", selectedOptionId: "x" }]);
    const r = await svc.submit("s1", a.attemptId); expect(r.correct).toBe(1); expect(r.incorrect).toBe(1);
    expect((await svc.submit("s1", a.attemptId)).percentage).toBe(r.percentage);
  });
  test("late saves close the attempt and score only what was stored in time", async () => {
    const { svc, advance } = setup(); const a = await svc.start("s1", "e1", false);
    await svc.saveAnswers("s1", a.attemptId, [{ questionId: "q1", selectedOptionId: "a" }]); advance(10 * 60 + 60);
    const r = await svc.saveAnswers("s1", a.attemptId, [{ questionId: "q2", selectedOptionId: "b" }]);
    expect(r.expired).toBe(true); if (r.expired) expect(r.result.correct).toBe(1);
  });
  test("other students cannot read or write an attempt", async () => {
    const { svc } = setup(); const a = await svc.start("s1", "e1", false);
    await expect(svc.saveAnswers("s2", a.attemptId, [{ questionId: "q1", selectedOptionId: "a" }])).rejects.toThrow("not found");
    await expect(svc.submit("s2", a.attemptId)).rejects.toThrow("not found");
  });
  test("ignores answers for questions outside the attempt", async () => {
    const { svc, store } = setup(); const a = await svc.start("s1", "e1", false);
    await svc.saveAnswers("s1", a.attemptId, [{ questionId: "zzz", selectedOptionId: "a" }]); expect(store.get(a.attemptId)!.answers.length).toBe(0);
  });
  test("enforces attempt limits and premium gating", async () => {
    const { svc } = setup(); for (let i = 0; i < 2; i++) { const a = await svc.start("s1", "e1", false); await svc.submit("s1", a.attemptId); }
    await expect(svc.start("s1", "e1", false)).rejects.toThrow("all attempts");
    const p = setup({ requiresPremium: true }); await expect(p.svc.start("s1", "e1", false)).rejects.toThrow("Premium"); expect((await p.svc.start("s1", "e1", true)).attemptId).toBeTruthy();
  });
  test("cannot save to a submitted attempt", async () => {
    const { svc } = setup(); const a = await svc.start("s1", "e1", false); await svc.submit("s1", a.attemptId);
    await expect(svc.saveAnswers("s1", a.attemptId, [{ questionId: "q1", selectedOptionId: "a" }])).rejects.toThrow("already submitted");
  });
});
