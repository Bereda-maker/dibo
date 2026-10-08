import { and, eq, gte, sql } from "drizzle-orm";
import { questions, questionOptions, studentAnswers, notes, learningMaterials, type Db } from "@dibora/database";
import { isCorrect } from "@dibora/core/exam-scoring";
import { DEFAULT_FREE, DEFAULT_PREMIUM, withinDailyLimit } from "@dibora/core/entitlement";
import { AppError, Errors } from "../utils/errors";
import type { ProgressService } from "./progress.service";

export class PracticeService {
  constructor(private db: Db, private progress: ProgressService) {}

  async answer(studentId: string, userId: string, isPremium: boolean, input: { questionId: string; selectedOptionId?: string | null; numericAnswer?: number | null; timeSpentSeconds?: number }) {
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
    const n = ((await this.db.select({ n: sql<number>`count(*)::int` }).from(studentAnswers).where(and(eq(studentAnswers.studentId, studentId), eq(studentAnswers.context, "PRACTICE"), gte(studentAnswers.answeredAt, midnight)))) as { n: number }[])[0]!.n;
    if (!withinDailyLimit(isPremium ? DEFAULT_PREMIUM : DEFAULT_FREE, "questionsPerDay", n)) throw new AppError(402, "DAILY_LIMIT", "You have reached today's free practice limit", { feature: "questionsPerDay" });
    const [q] = await this.db.select().from(questions).where(and(eq(questions.id, input.questionId), eq(questions.status, "PUBLISHED"))).limit(1);
    if (!q) throw Errors.notFound("Question");
    const opts = await this.db.select().from(questionOptions).where(eq(questionOptions.questionId, q.id));
    const correctOpt = opts.find((o) => o.isCorrect);
    const ok = isCorrect({ id: q.id, topicId: q.topicId, difficulty: q.difficulty, type: q.type, marks: 1, correctOptionId: correctOpt?.id, numericAnswer: q.numericAnswer == null ? null : Number(q.numericAnswer), numericTolerance: Number(q.numericTolerance) }, { questionId: q.id, selectedOptionId: input.selectedOptionId, numericAnswer: input.numericAnswer });
    if (ok === null) throw Errors.badRequest("Provide an answer");
    await this.db.insert(studentAnswers).values({ studentId, questionId: q.id, context: "PRACTICE", selectedOptionId: input.selectedOptionId ?? null, numericAnswer: input.numericAnswer == null ? null : String(input.numericAnswer), isCorrect: ok, timeSpentSeconds: input.timeSpentSeconds ?? 0 });
    await this.progress.recordActivity(studentId, "PRACTICE", ok ? 10 : 0, input.timeSpentSeconds ?? 0);
    const unlocked = await this.progress.evaluateAchievements(studentId, userId);
    const [note] = await this.db.select({ id: notes.id }).from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).where(and(eq(learningMaterials.topicId, q.topicId), eq(learningMaterials.status, "PUBLISHED"))).limit(1);
    // The correct answer and explanation are only revealed after the answer is recorded.
    return { correct: ok, correctAnswer: q.type === "NUMERICAL" ? q.numericAnswer : correctOpt?.text ?? null, explanation: q.explanation, topicId: q.topicId, recommendedNoteId: note?.id ?? null, unlocked };
  }

  /** Question delivery never includes correctness flags. */
  async next(studentId: string, opts: { topicId?: string; difficulty?: "EASY" | "MEDIUM" | "HARD"; mode?: "random" | "wrong"; limit: number }) {
    const conds = [eq(questions.status, "PUBLISHED"), opts.topicId ? eq(questions.topicId, opts.topicId) : undefined, opts.difficulty ? eq(questions.difficulty, opts.difficulty) : undefined,
      opts.mode === "wrong" ? sql`${questions.id} in (select question_id from (select distinct on (question_id) question_id, is_correct from student_answers where student_id = ${studentId} and is_correct is not null order by question_id, answered_at desc) t where is_correct = false)` : undefined].filter(Boolean) as never[];
    const qs = await this.db.select({ id: questions.id, text: questions.text, type: questions.type, difficulty: questions.difficulty, topicId: questions.topicId }).from(questions).where(and(...conds)).orderBy(sql`random()`).limit(opts.limit);
    const ids = qs.map((q) => q.id); if (!ids.length) return [];
    const os = await this.db.select({ id: questionOptions.id, questionId: questionOptions.questionId, text: questionOptions.text }).from(questionOptions).where(sql`${questionOptions.questionId} in ${ids}`).orderBy(questionOptions.sortOrder);
    return qs.map((q) => ({ ...q, options: os.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, text: o.text })) }));
  }
}
