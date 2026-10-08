import { and, desc, eq, gte, ilike, inArray, isNull, sql } from "drizzle-orm";
import { bookmarks, exams, examAttempts, examQuestions, learningMaterials, notes, questionOptions, questions, studentAnswers, studentProfiles, studentProgress, subjects, topics, topicProgress, type Db } from "@dibora/database";
import type { ProgressService } from "./progress.service";
import { Errors } from "../utils/errors";

const like = (q: string) => `%${q.replace(/[%_\\]/g, "")}%`;

export class LearningService {
  constructor(private db: Db, private progress: ProgressService) {}

  async exams(studentId: string, isPremium: boolean) {
    const list = await this.db.select().from(exams).where(and(eq(exams.status, "PUBLISHED"), isNull(exams.deletedAt))).orderBy(exams.type, exams.title);
    const mine = await this.db.select({ examId: examAttempts.examId, id: examAttempts.id, status: examAttempts.status, pct: examAttempts.percentage }).from(examAttempts).where(eq(examAttempts.studentId, studentId));
    return list.map((e) => { const a = mine.filter((m) => m.examId === e.id);
      return { id: e.id, type: e.type, title: e.title, description: e.description, minutes: e.durationMinutes, questionCount: e.questionCount, passingScore: e.passingScore, locked: e.requiresPremium && !isPremium,
        bestPercentage: a.filter((x) => x.status !== "IN_PROGRESS").reduce<number | null>((b, x) => Math.max(b ?? 0, Number(x.pct ?? 0)), null), inProgressAttemptId: a.find((x) => x.status === "IN_PROGRESS")?.id ?? null }; });
  }

  /** In-progress: questions without correctness. Submitted: result plus a full review with answers revealed. Scoped to the owner. */
  async attempt(studentId: string, attemptId: string) {
    const [a] = await this.db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.studentId, studentId)));
    if (!a) throw Errors.notFound("Attempt");
    const [e] = await this.db.select({ title: exams.title, type: exams.type, minutes: exams.durationMinutes, passing: exams.passingScore }).from(exams).where(eq(exams.id, a.examId));
    const qs = a.questionOrder.length ? await this.db.select().from(questions).where(inArray(questions.id, a.questionOrder)) : [];
    const opts = qs.length ? await this.db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map((q) => q.id))).orderBy(questionOptions.sortOrder) : [];
    const ans = await this.db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));
    const tn = qs.length ? await this.db.select({ id: topics.id, n: topics.names }).from(topics).where(inArray(topics.id, [...new Set(qs.map((q) => q.topicId))])) : [];
    const done = a.status !== "IN_PROGRESS";
    const items = a.questionOrder.map((id) => { const q = qs.find((x) => x.id === id)!; const mine = ans.find((x) => x.questionId === id);
      const base = { id, text: q.text, type: q.type, difficulty: q.difficulty, topicId: q.topicId, topicName: tn.find((t) => t.id === q.topicId)?.n.en ?? "Topic", options: opts.filter((o) => o.questionId === id).map((o) => ({ id: o.id, text: o.text })), yourOptionId: mine?.selectedOptionId ?? null, yourNumeric: mine?.numericAnswer == null ? null : Number(mine.numericAnswer) };
      return done ? { ...base, correctOptionId: opts.find((o) => o.questionId === id && o.isCorrect)?.id ?? null, correctNumeric: q.numericAnswer == null ? null : Number(q.numericAnswer), explanation: q.explanation, isCorrect: mine?.isCorrect ?? null } : base; });
    return { id: a.id, examId: a.examId, title: e?.title, type: e?.type, status: a.status, deadlineAt: a.deadlineAt, serverNow: new Date(), submittedAt: a.submittedAt, result: done ? a.result : null, questions: items };
  }

  async bookmarks(studentId: string) {
    const rows = await this.db.select({ type: bookmarks.targetType, id: bookmarks.targetId, createdAt: bookmarks.createdAt }).from(bookmarks).where(eq(bookmarks.studentId, studentId)).orderBy(desc(bookmarks.createdAt));
    const ids = (t: string) => rows.filter((r) => r.type === t).map((r) => r.id);
    const nt = ids("NOTE").length ? await this.db.select({ id: notes.id, t: notes.title }).from(notes).where(inArray(notes.id, ids("NOTE"))) : [];
    const qq = ids("QUESTION").length ? await this.db.select({ id: questions.id, t: questions.text, topicId: questions.topicId }).from(questions).where(inArray(questions.id, ids("QUESTION"))) : [];
    const tp = ids("TOPIC").length ? await this.db.select({ id: topics.id, n: topics.names }).from(topics).where(inArray(topics.id, ids("TOPIC"))) : [];
    return rows.map((r) => ({ ...r, title: r.type === "NOTE" ? nt.find((x) => x.id === r.id)?.t : r.type === "QUESTION" ? qq.find((x) => x.id === r.id)?.t : tp.find((x) => x.id === r.id)?.n.en, topicId: r.type === "QUESTION" ? qq.find((x) => x.id === r.id)?.topicId : r.type === "TOPIC" ? r.id : undefined })).filter((r) => r.title);
  }
  async addBookmark(studentId: string, type: "NOTE" | "QUESTION" | "TOPIC", id: string) { await this.db.insert(bookmarks).values({ studentId, targetType: type, targetId: id }).onConflictDoNothing(); }
  async removeBookmark(studentId: string, type: string, id: string) { await this.db.delete(bookmarks).where(and(eq(bookmarks.studentId, studentId), eq(bookmarks.targetType, type), eq(bookmarks.targetId, id))); }

  async completeNote(studentId: string, userId: string, noteId: string) {
    const [n] = await this.db.select({ topicId: learningMaterials.topicId }).from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).where(and(eq(notes.id, noteId), eq(learningMaterials.status, "PUBLISHED")));
    if (!n) throw Errors.notFound("Note");
    await this.db.insert(topicProgress).values({ studentId, topicId: n.topicId, noteCompleted: true }).onConflictDoUpdate({ target: [topicProgress.studentId, topicProgress.topicId], set: { noteCompleted: true } });
    await this.db.update(studentProgress).set({ notesCompleted: sql`${studentProgress.notesCompleted} + 1` }).where(eq(studentProgress.studentId, studentId));
    await this.progress.recordActivity(studentId, "NOTE", 5);
    return { completed: true };
  }
  async completedNotes(studentId: string) {
    return this.db.select({ topicId: topicProgress.topicId }).from(topicProgress).where(and(eq(topicProgress.studentId, studentId), eq(topicProgress.noteCompleted, true)));
  }

  /** Only students who opted in appear; only display name and points are exposed. */
  async leaderboard(period: "weekly" | "monthly" | "overall", limit = 20) {
    const since = period === "overall" ? null : new Date(Date.now() - (period === "weekly" ? 7 : 30) * 864e5);
    const rows = await this.db.select({ name: sql<string>`coalesce(${studentProfiles.displayName}, split_part(${studentProfiles.fullName}, ' ', 1))`, points: since ? sql<number>`coalesce(sum(case when ${studentAnswers.isCorrect} then 10 else 0 end),0)::int` : sql<number>`coalesce(${studentProgress.points},0)::int` })
      .from(studentProfiles).leftJoin(studentProgress, eq(studentProgress.studentId, studentProfiles.id)).leftJoin(studentAnswers, since ? and(eq(studentAnswers.studentId, studentProfiles.id), gte(studentAnswers.answeredAt, since)) : sql`false`)
      .where(and(eq(studentProfiles.leaderboardOptIn, true), isNull(studentProfiles.deletedAt))).groupBy(studentProfiles.id, studentProgress.points).orderBy(desc(since ? sql`2` : studentProgress.points)).limit(limit);
    return rows.map((r, i) => ({ rank: i + 1, name: r.name, points: Number(r.points) }));
  }

  async search(q: string, kinds: string[] | undefined, limit = 20) {
    const want = (k: string) => !kinds?.length || kinds.includes(k); const out: { kind: string; id: string; title: string; sub?: string | null }[] = [];
    if (want("subject")) out.push(...(await this.db.select({ id: subjects.id, n: subjects.names }).from(subjects).where(and(eq(subjects.status, "PUBLISHED"), sql`${subjects.names}::text ilike ${like(q)}`)).limit(limit)).map((r) => ({ kind: "subject", id: r.id, title: r.n.en ?? "Subject" })));
    if (want("topic")) out.push(...(await this.db.select({ id: topics.id, n: topics.names }).from(topics).where(and(eq(topics.status, "PUBLISHED"), sql`${topics.names}::text ilike ${like(q)}`)).limit(limit)).map((r) => ({ kind: "topic", id: r.id, title: r.n.en ?? "Topic" })));
    if (want("note")) out.push(...(await this.db.select({ id: notes.id, t: notes.title, s: notes.summary }).from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).where(and(eq(learningMaterials.status, "PUBLISHED"), ilike(notes.title, like(q)))).limit(limit)).map((r) => ({ kind: "note", id: r.id, title: r.t, sub: r.s })));
    if (want("question")) out.push(...(await this.db.select({ id: questions.id, t: questions.text }).from(questions).where(and(eq(questions.status, "PUBLISHED"), ilike(questions.text, like(q)))).limit(limit)).map((r) => ({ kind: "question", id: r.id, title: r.t })));
    if (want("exam")) out.push(...(await this.db.select({ id: exams.id, t: exams.title, d: exams.description }).from(exams).where(and(eq(exams.status, "PUBLISHED"), ilike(exams.title, like(q)))).limit(limit)).map((r) => ({ kind: "exam", id: r.id, title: r.t, sub: r.d })));
    return out.slice(0, limit * 2);
  }
}
