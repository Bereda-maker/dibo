import { describe, expect, test, beforeAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { resolve } from "node:path";
import { ProgressService } from "../src/services/progress.service";
import { PracticeService } from "../src/services/practice.service";

const raw = drizzle(new PGlite(), { schema: s }); const db = raw as unknown as Db;
const progress = new ProgressService(db); const practice = new PracticeService(db, progress);
let st = "", user = "", q: { id: string; ok: string; bad: string }[] = [], topic = "";

beforeAll(async () => {
  await migrate(raw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  const [u] = await raw.insert(s.users).values({ email: "x@y.et", passwordHash: "h" }).returning(); user = u!.id;
  const [p] = await raw.insert(s.studentProfiles).values({ userId: user, fullName: "X", grade: 12 }).returning(); st = p!.id;
  const [sub] = await raw.insert(s.subjects).values({ grade: 12, slug: "phy", names: { en: "Physics" }, status: "PUBLISHED" }).returning();
  const [t] = await raw.insert(s.topics).values({ subjectId: sub!.id, slug: "mech", names: { en: "Mechanics" }, status: "PUBLISHED" }).returning(); topic = t!.id;
  await raw.insert(s.achievements).values([{ code: "FIRST_EXAM", names: { en: "First Exam" }, criteria: {}, points: 20 }]);
  for (let i = 0; i < 25; i++) {
    const [qq] = await raw.insert(s.questions).values({ subjectId: sub!.id, topicId: t!.id, difficulty: "EASY", type: "MULTIPLE_CHOICE", text: `Q${i}`, explanation: "why", status: "PUBLISHED" }).returning();
    const [ok] = await raw.insert(s.questionOptions).values({ questionId: qq!.id, text: "right", isCorrect: true }).returning();
    const [bad] = await raw.insert(s.questionOptions).values({ questionId: qq!.id, text: "wrong", isCorrect: false }).returning();
    q.push({ id: qq!.id, ok: ok!.id, bad: bad!.id });
  }
});

describe("practice, progress and recommendations on PostgreSQL", () => {
  test("served questions never leak the correct answer", async () => {
    const qs = await practice.next(st, { topicId: topic, limit: 3 }); expect(qs.length).toBe(3);
    expect(JSON.stringify(qs)).not.toContain("isCorrect"); expect(qs[0]!.options.length).toBe(2);
  });
  test("correct and incorrect answers give feedback and update progress", async () => {
    const good = await practice.answer(st, user, false, { questionId: q[0]!.id, selectedOptionId: q[0]!.ok }); expect(good.correct).toBe(true);
    const bad = await practice.answer(st, user, false, { questionId: q[1]!.id, selectedOptionId: q[1]!.bad }); expect(bad.correct).toBe(false); expect(bad.correctAnswer).toBe("right"); expect(bad.explanation).toBe("why");
    for (let i = 2; i < 8; i++) await practice.answer(st, user, false, { questionId: q[i]!.id, selectedOptionId: q[i]!.bad });
    const sum = await progress.summary(st); expect(sum.questionsAttempted).toBe(8); expect(sum.questionsCorrect).toBe(1); expect(sum.streak).toBe(1); expect(sum.points).toBe(10);
    expect(sum.readiness.disclaimer).toContain("not a prediction");
  });
  test("weak topic produces an explainable HIGH recommendation", async () => {
    const [r] = await progress.recommendations(st); expect(r!.priority).toBe("HIGH"); expect(r!.reason).toContain("Physics → Mechanics");
  });
  test("previously-wrong mode returns only missed questions", async () => {
    const wrong = await practice.next(st, { mode: "wrong", limit: 50 }); const ids = new Set(wrong.map((w) => w.id));
    expect(ids.has(q[0]!.id)).toBe(false); expect(ids.has(q[1]!.id)).toBe(true);
  });
  test("free daily limit is enforced, premium is not", async () => {
    for (let i = 8; i < 20; i++) await practice.answer(st, user, false, { questionId: q[i]!.id, selectedOptionId: q[i]!.ok });
    await expect(practice.answer(st, user, false, { questionId: q[20]!.id, selectedOptionId: q[20]!.ok })).rejects.toThrow("free practice limit");
    expect((await practice.answer(st, user, true, { questionId: q[20]!.id, selectedOptionId: q[20]!.ok })).correct).toBe(true);
  });
  test("unpublished questions cannot be answered", async () => {
    await raw.update(s.questions).set({ status: "DRAFT" }).where(eq(s.questions.id, q[21]!.id));
    await expect(practice.answer(st, user, true, { questionId: q[21]!.id, selectedOptionId: q[21]!.ok })).rejects.toThrow("not found");
  });
  test("achievement unlocks once and notifies once", async () => {
    await raw.insert(s.exams).values({ type: "TOPIC", title: "E", durationMinutes: 5, questionCount: 1, status: "PUBLISHED" });
    const [e] = await raw.select().from(s.exams);
    await raw.insert(s.examAttempts).values({ studentId: st, examId: e!.id, status: "SUBMITTED", deadlineAt: new Date(), questionOrder: [], percentage: "50" });
    expect(await progress.evaluateAchievements(st, user)).toEqual(["First Exam"]); expect(await progress.evaluateAchievements(st, user)).toEqual([]);
    expect((await raw.select().from(s.notifications).where(eq(s.notifications.type, "ACHIEVEMENT"))).length).toBe(1);
  });
});
