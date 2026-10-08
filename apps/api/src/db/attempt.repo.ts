import { and, eq, inArray, sql } from "drizzle-orm";
import { examAttempts, examQuestions, exams, questionOptions, questions, studentAnswers, studentProfiles, subscriptions, type Db } from "@dibora/database";
import type { ScorableQuestion, ScoreResult } from "@dibora/core/exam-scoring";
import type { AttemptRepo, StoredAttempt } from "../services/attempt.service";

/** NOTE: written against the schema but not yet exercised against a live PostgreSQL instance. */
export class DrizzleAttemptRepo implements AttemptRepo {
  constructor(private db: Db) {}

  async getExam(examId: string) {
    const [e] = await this.db.select().from(exams).where(and(eq(exams.id, examId), eq(exams.status, "PUBLISHED"))).limit(1);
    if (!e) return null;
    const rows = await this.db.select({ q: questions, marks: examQuestions.marks }).from(examQuestions).innerJoin(questions, eq(questions.id, examQuestions.questionId)).where(eq(examQuestions.examId, examId)).orderBy(examQuestions.sortOrder);
    const correct = rows.length ? await this.db.select({ qid: questionOptions.questionId, id: questionOptions.id }).from(questionOptions).where(and(inArray(questionOptions.questionId, rows.map((r) => r.q.id)), eq(questionOptions.isCorrect, true))) : [];
    const qs: ScorableQuestion[] = rows.map(({ q, marks }) => ({ id: q.id, topicId: q.topicId, difficulty: q.difficulty, type: q.type, marks, correctOptionId: correct.find((c) => c.qid === q.id)?.id ?? null, numericAnswer: q.numericAnswer == null ? null : Number(q.numericAnswer), numericTolerance: Number(q.numericTolerance) }));
    return { id: e.id, minutes: e.durationMinutes, passing: e.passingScore, attemptLimit: e.attemptLimit, requiresPremium: e.requiresPremium, randomize: e.randomize, questions: qs };
  }

  private async hydrate(row: typeof examAttempts.$inferSelect): Promise<StoredAttempt> {
    const ans = await this.db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, row.id));
    return { id: row.id, studentId: row.studentId, examId: row.examId, status: row.status as StoredAttempt["status"], deadlineAt: row.deadlineAt, questionOrder: row.questionOrder, result: (row.result ?? undefined) as ScoreResult | undefined,
      answers: ans.map((a) => ({ questionId: a.questionId, selectedOptionId: a.selectedOptionId, numericAnswer: a.numericAnswer == null ? null : Number(a.numericAnswer), timeSpentSeconds: a.timeSpentSeconds })) };
  }
  async findInProgress(studentId: string, examId: string) {
    const [r] = await this.db.select().from(examAttempts).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.examId, examId), eq(examAttempts.status, "IN_PROGRESS"))).limit(1);
    return r ? this.hydrate(r) : null;
  }
  async countAttempts(studentId: string, examId: string) {
    const [r] = await this.db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.examId, examId)));
    return r?.n ?? 0;
  }
  async create(a: { studentId: string; examId: string; deadlineAt: Date; questionOrder: string[] }) {
    const [r] = await this.db.insert(examAttempts).values(a).returning();
    return this.hydrate(r!);
  }
  async get(attemptId: string, studentId: string) {
    const [r] = await this.db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.studentId, studentId))).limit(1);
    return r ? this.hydrate(r) : null;
  }
  async upsertAnswers(attemptId: string, answers: { questionId: string; selectedOptionId?: string | null; numericAnswer?: number | null; timeSpentSeconds?: number }[]) {
    if (!answers.length) return;
    const [att] = await this.db.select({ studentId: examAttempts.studentId }).from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    await this.db.insert(studentAnswers).values(answers.map((a) => ({ attemptId, studentId: att!.studentId, questionId: a.questionId, selectedOptionId: a.selectedOptionId ?? null, numericAnswer: a.numericAnswer == null ? null : String(a.numericAnswer), timeSpentSeconds: a.timeSpentSeconds ?? 0 })))
      .onConflictDoUpdate({ target: [studentAnswers.attemptId, studentAnswers.questionId], set: { selectedOptionId: sql`excluded.selected_option_id`, numericAnswer: sql`excluded.numeric_answer`, timeSpentSeconds: sql`excluded.time_spent_seconds`, answeredAt: sql`now()` } });
  }
  async finalize(attemptId: string, status: "SUBMITTED" | "EXPIRED", result: ScoreResult) {
    return this.db.transaction(async (tx) => {
      const done = await tx.update(examAttempts).set({ status, submittedAt: new Date(), score: result.score, maxScore: result.maxScore, percentage: String(result.percentage), result: result as unknown as Record<string, unknown> })
        .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.status, "IN_PROGRESS"))).returning({ id: examAttempts.id }); // compare-and-set: only one finalize wins
      if (!done.length) return false;
      for (const o of result.outcomes) await tx.update(studentAnswers).set({ isCorrect: o.status === "UNANSWERED" ? null : o.status === "CORRECT" }).where(and(eq(studentAnswers.attemptId, attemptId), eq(studentAnswers.questionId, o.questionId)));
      return true;
    });
  }
}

/** Resolves the logged-in user to a student profile and current plan. Premium is derived from an ACTIVE, unexpired subscription, never from a client flag. */
export async function studentContext(db: Db, userId: string) {
  const [p] = await db.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (!p) return null;
  const [s] = await db.select({ ends: subscriptions.endsAt }).from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "ACTIVE"))).limit(1);
  return { studentId: p.id, isPremium: !!s && (!s.ends || s.ends > new Date()) };
}
