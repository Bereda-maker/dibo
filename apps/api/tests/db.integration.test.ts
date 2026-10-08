import { describe, expect, test, beforeAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { DrizzleAttemptRepo, studentContext } from "../src/db/attempt.repo";
import { AttemptService } from "../src/services/attempt.service";
import { resolve } from "node:path";

// Real PostgreSQL engine (WASM): applies the generated migration and exercises the Drizzle repository.
const raw = drizzle(new PGlite(), { schema: s }); const db = raw as unknown as Db;
let ids: { student: string; user: string; exam: string; q1: string; q2: string; o1: string; o2: string };

beforeAll(async () => {
  await migrate(raw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  const [u] = await raw.insert(s.users).values({ email: "a@b.et", passwordHash: "x" }).returning();
  const [p] = await raw.insert(s.studentProfiles).values({ userId: u!.id, fullName: "Abel", grade: 12 }).returning();
  const [sub] = await raw.insert(s.subjects).values({ grade: 12, slug: "math", names: { en: "Math" }, status: "PUBLISHED" }).returning();
  const [t] = await raw.insert(s.topics).values({ subjectId: sub!.id, slug: "alg", names: { en: "Algebra" }, status: "PUBLISHED" }).returning();
  const mk = async (text: string) => (await raw.insert(s.questions).values({ subjectId: sub!.id, topicId: t!.id, difficulty: "EASY", type: "MULTIPLE_CHOICE", text, explanation: "because", status: "PUBLISHED" }).returning())[0]!;
  const q1 = await mk("2+2?"), q2 = await mk("3+3?");
  const [o1] = await raw.insert(s.questionOptions).values({ questionId: q1.id, text: "4", isCorrect: true }).returning();
  await raw.insert(s.questionOptions).values({ questionId: q1.id, text: "5", isCorrect: false });
  const [o2] = await raw.insert(s.questionOptions).values({ questionId: q2.id, text: "6", isCorrect: true }).returning();
  const [e] = await raw.insert(s.exams).values({ type: "TOPIC", title: "T", durationMinutes: 10, questionCount: 2, status: "PUBLISHED", attemptLimit: 2 }).returning();
  await raw.insert(s.examQuestions).values([{ examId: e!.id, questionId: q1.id, sortOrder: 0 }, { examId: e!.id, questionId: q2.id, sortOrder: 1 }]);
  ids = { student: p!.id, user: u!.id, exam: e!.id, q1: q1.id, q2: q2.id, o1: o1!.id, o2: o2!.id };
});

describe("schema + attempt repository on PostgreSQL", () => {
  test("full flow: start, autosave (upsert), resume, submit, idempotent", async () => {
    const svc = new AttemptService(new DrizzleAttemptRepo(db));
    const a = await svc.start(ids.student, ids.exam, false);
    expect(a.questionOrder).toEqual([ids.q1, ids.q2]);
    await svc.saveAnswers(ids.student, a.attemptId, [{ questionId: ids.q1, selectedOptionId: "00000000-0000-4000-8000-000000000000" }].slice(0, 0));
    await svc.saveAnswers(ids.student, a.attemptId, [{ questionId: ids.q1, selectedOptionId: ids.o1, timeSpentSeconds: 5 }]);
    await svc.saveAnswers(ids.student, a.attemptId, [{ questionId: ids.q1, selectedOptionId: ids.o1, timeSpentSeconds: 9 }, { questionId: ids.q2, selectedOptionId: ids.o2 }]); // overwrite, no duplicate row
    const again = await svc.start(ids.student, ids.exam, false); expect(again.attemptId).toBe(a.attemptId); expect(again.answers.length).toBe(2);
    const r = await svc.submit(ids.student, a.attemptId); expect(r.correct).toBe(2); expect(r.percentage).toBe(100);
    expect((await svc.submit(ids.student, a.attemptId)).percentage).toBe(100);
    const rows = await raw.select().from(s.studentAnswers); expect(rows.length).toBe(2); expect(rows.every((x) => x.isCorrect === true)).toBe(true);
  });
  test("another student cannot see the attempt; attempt limit enforced", async () => {
    const [u2] = await raw.insert(s.users).values({ email: "c@d.et", passwordHash: "x" }).returning();
    const [p2] = await raw.insert(s.studentProfiles).values({ userId: u2!.id, fullName: "Hana", grade: 12 }).returning();
    const svc = new AttemptService(new DrizzleAttemptRepo(db));
    const a = await svc.start(ids.student, ids.exam, false);
    await expect(svc.submit(p2!.id, a.attemptId)).rejects.toThrow("not found");
    await svc.submit(ids.student, a.attemptId);
    await expect(svc.start(ids.student, ids.exam, false)).rejects.toThrow("all attempts");
  });
  test("premium derives from an ACTIVE unexpired subscription only", async () => {
    expect((await studentContext(db, ids.user))!.isPremium).toBe(false);
    const [plan] = await raw.insert(s.subscriptionPlans).values({ code: "m", interval: "MONTHLY", names: { en: "M" }, priceMinor: 100, entitlements: {} }).returning();
    await raw.insert(s.subscriptions).values({ userId: ids.user, planId: plan!.id, status: "ACTIVE", endsAt: new Date(Date.now() - 1000) });
    expect((await studentContext(db, ids.user))!.isPremium).toBe(false); // expired
  });
});
