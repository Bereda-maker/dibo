import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { examAttempts, exams, notifications, questions, studentAchievements, achievements, studentAnswers, studentProgress, studySessions, topicProgress, topics, subjects, type Db } from "@dibora/database";
import { recommend, type TopicStat } from "@dibora/core/recommendation";
import { computeReadiness } from "@dibora/core/readiness";

const dayStr = (d = new Date()) => d.toISOString().slice(0, 10);

export class ProgressService {
  constructor(private db: Db) {}

  /** Records a study day, streak, points and session; call after any learning activity. */
  async recordActivity(studentId: string, activity: "NOTE" | "PRACTICE" | "EXAM" | "AI", points = 0, seconds = 0) {
    const today = dayStr(), yesterday = dayStr(new Date(Date.now() - 864e5));
    await this.db.transaction(async (tx) => {
      await tx.insert(studentProgress).values({ studentId }).onConflictDoNothing();
      const [p] = await tx.select().from(studentProgress).where(eq(studentProgress.studentId, studentId));
      const streak = p!.lastActiveDay === today ? p!.currentStreak : p!.lastActiveDay === yesterday ? p!.currentStreak + 1 : 1;
      await tx.update(studentProgress).set({ currentStreak: streak, longestStreak: Math.max(streak, p!.longestStreak), lastActiveDay: today, points: p!.points + points, updatedAt: new Date() }).where(eq(studentProgress.studentId, studentId));
      await tx.insert(studySessions).values({ studentId, activity, day: today, durationSeconds: seconds });
    });
  }

  /** Per-topic stats from the answer log: all-time and the 20 most recent per topic. */
  async topicStats(studentId: string): Promise<TopicStat[]> {
    const rows = await this.db.select({ topicId: questions.topicId, correct: studentAnswers.isCorrect, at: studentAnswers.answeredAt }).from(studentAnswers).innerJoin(questions, eq(questions.id, studentAnswers.questionId))
      .where(and(eq(studentAnswers.studentId, studentId), sql`${studentAnswers.isCorrect} is not null`)).orderBy(desc(studentAnswers.answeredAt)).limit(2000);
    const by = new Map<string, { c: boolean; at: Date }[]>(); for (const r of rows) (by.get(r.topicId) ?? by.set(r.topicId, []).get(r.topicId)!).push({ c: !!r.correct, at: r.at });
    if (!by.size) return [];
    const meta = await this.db.select({ id: topics.id, tn: topics.names, sn: subjects.names }).from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId)).where(inArray(topics.id, [...by.keys()]));
    const completed = new Set((await this.db.select({ topicId: topicProgress.topicId }).from(topicProgress).where(and(eq(topicProgress.studentId, studentId), eq(topicProgress.noteCompleted, true)))).map((x) => x.topicId));
    return meta.map((m) => { const l = by.get(m.id)!, recent = l.slice(0, 20);
      return { topicId: m.id, topicName: m.tn.en ?? "Topic", subjectName: m.sn.en ?? "Subject", attempted: l.length, correct: l.filter((x) => x.c).length, recentAttempted: recent.length, recentCorrect: recent.filter((x) => x.c).length, noteCompleted: completed.has(m.id), daysSincePracticed: Math.floor((Date.now() - l[0]!.at.getTime()) / 864e5) }; });
  }

  async summary(studentId: string) {
    const stats = await this.topicStats(studentId);
    const [p] = await this.db.select().from(studentProgress).where(eq(studentProgress.studentId, studentId));
    const att = stats.reduce((n, t) => n + t.attempted, 0), cor = stats.reduce((n, t) => n + t.correct, 0);
    const rec = stats.reduce((n, t) => n + t.recentAttempted, 0), recC = stats.reduce((n, t) => n + t.recentCorrect, 0);
    const mocks = await this.db.select({ pct: examAttempts.percentage }).from(examAttempts).innerJoin(exams, eq(exams.id, examAttempts.examId)).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.status, "SUBMITTED"), eq(exams.type, "MOCK")));
    const since = dayStr(new Date(Date.now() - 14 * 864e5));
    const days = await this.db.selectDistinct({ day: studySessions.day }).from(studySessions).where(and(eq(studySessions.studentId, studentId), gte(studySessions.day, since)));
    const readiness = computeReadiness({ knowledgeAccuracy: att ? (cor / att) * 100 : 0, practiceAccuracy: rec ? (recC / rec) * 100 : 0, mockAverage: mocks.length ? mocks.reduce((n, m) => n + Number(m.pct), 0) / mocks.length : null, activeDaysLast14: days.length });
    return { questionsAttempted: att, questionsCorrect: cor, accuracy: att ? Math.round((cor / att) * 100) : null, streak: p?.currentStreak ?? 0, longestStreak: p?.longestStreak ?? 0, points: p?.points ?? 0, readiness, topics: stats };
  }

  async recommendations(studentId: string, limit = 5) { return recommend(await this.topicStats(studentId), limit); }

  /** Unlocks achievements the student has earned and notifies once. */
  async evaluateAchievements(studentId: string, userId: string) {
    const s = await this.summary(studentId);
    const exams_ = ((await this.db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.status, "SUBMITTED")))) as { n: number }[])[0]!.n;
    const [best] = await this.db.select({ m: sql<number>`coalesce(max(${examAttempts.percentage}::numeric),0)::float` }).from(examAttempts).where(eq(examAttempts.studentId, studentId));
    const [mock] = await this.db.select({ n: sql<number>`count(*)::int` }).from(examAttempts).innerJoin(exams, eq(exams.id, examAttempts.examId)).where(and(eq(examAttempts.studentId, studentId), eq(exams.type, "MOCK"), eq(examAttempts.status, "SUBMITTED")));
    const earned = new Set([exams_ > 0 && "FIRST_EXAM", s.questionsAttempted >= 100 && "Q100", s.questionsAttempted >= 500 && "Q500", s.longestStreak >= 7 && "S7", s.longestStreak >= 30 && "S30", (best?.m ?? 0) >= 90 && "E90", (mock?.n ?? 0) > 0 && "MOCK", s.topics.some((t) => t.attempted >= 20 && t.correct / t.attempted >= 0.9) && "MASTERY"].filter(Boolean) as string[]);
    if (!earned.size) return [];
    const defs = await this.db.select().from(achievements).where(inArray(achievements.code, [...earned]));
    const fresh: string[] = [];
    for (const d of defs) {
      const ins = await this.db.insert(studentAchievements).values({ studentId, achievementId: d.id }).onConflictDoNothing().returning();
      if (ins.length) { fresh.push(d.names.en ?? d.code); await this.db.insert(notifications).values({ userId, type: "ACHIEVEMENT", title: "Achievement unlocked", body: d.names.en ?? d.code });
        await this.db.update(studentProgress).set({ points: sql`${studentProgress.points} + ${d.points}` }).where(eq(studentProgress.studentId, studentId)); }
    }
    return fresh;
  }
}
