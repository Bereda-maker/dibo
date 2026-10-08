import { and, desc, eq, gte, inArray, isNull, or, ilike, sql } from "drizzle-orm";
import { aiConversations, aiMessages, notes, learningMaterials, studentProfiles, examAttempts, exams, type Db } from "@dibora/database";
import { DEFAULT_FREE, DEFAULT_PREMIUM, withinDailyLimit } from "@dibora/core/entitlement";
import { AIService, type ContentRetriever, type StudentContext } from "./ai/ai.service";
import type { ProgressService } from "./progress.service";
import { AppError, Errors } from "../utils/errors";

/** Retrieval over approved, published notes only (Postgres ILIKE today; swap for FTS/embeddings later). */
export class DbRetriever implements ContentRetriever {
  constructor(private db: Db) {}
  async search(query: string, opts: { topicId?: string; limit: number }) {
    const words = [...new Set(query.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 3))].slice(0, 6); if (!words.length) return [];
    const match = or(...words.flatMap((w) => [ilike(notes.title, `%${w}%`), ilike(notes.summary, `%${w}%`), sql`${notes.content}::text ilike ${"%" + w + "%"}`]));
    const rows = await this.db.select({ id: notes.id, title: notes.title, summary: notes.summary, content: notes.content }).from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId))
      .where(and(eq(learningMaterials.status, "PUBLISHED"), opts.topicId ? eq(learningMaterials.topicId, opts.topicId) : undefined, match)).limit(opts.limit);
    return rows.map((r) => ({ id: r.id, title: r.title, text: `${r.summary ?? ""}\n${JSON.stringify(r.content).slice(0, 1500)}` }));
  }
}

export class AiChatService {
  constructor(private db: Db, private ai: AIService, private progress: ProgressService) {}

  list(userId: string) { return this.db.select({ id: aiConversations.id, title: aiConversations.title, updatedAt: aiConversations.updatedAt }).from(aiConversations).where(and(eq(aiConversations.userId, userId), isNull(aiConversations.deletedAt))).orderBy(desc(aiConversations.updatedAt)).limit(50); }
  /** Every lookup is scoped to the owner: another student's conversation id behaves as "not found". */
  private async owned(userId: string, id: string) {
    const [c] = await this.db.select().from(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId), isNull(aiConversations.deletedAt))).limit(1);
    if (!c) throw Errors.notFound("Conversation"); return c;
  }
  async messages(userId: string, id: string) { await this.owned(userId, id); return this.db.select({ role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt }).from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(aiMessages.createdAt); }
  async rename(userId: string, id: string, title: string) { await this.owned(userId, id); await this.db.update(aiConversations).set({ title: title.slice(0, 80), updatedAt: new Date() }).where(eq(aiConversations.id, id)); }
  async remove(userId: string, id: string) { await this.owned(userId, id); await this.db.update(aiConversations).set({ deletedAt: new Date() }).where(eq(aiConversations.id, id)); }

  async send(userId: string, studentId: string, isPremium: boolean, input: { conversationId?: string; topicId?: string; message: string }) {
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
    const used = ((await this.db.select({ n: sql<number>`count(*)::int` }).from(aiMessages).innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId)).where(and(eq(aiConversations.userId, userId), eq(aiMessages.role, "user"), gte(aiMessages.createdAt, midnight)))) as { n: number }[])[0]!.n;
    if (!withinDailyLimit(isPremium ? DEFAULT_PREMIUM : DEFAULT_FREE, "aiMessagesPerDay", used)) throw new AppError(402, "DAILY_LIMIT", "You have reached today's AI message limit", { feature: "aiMessagesPerDay" });
    const conv = input.conversationId ? await this.owned(userId, input.conversationId) : (await this.db.insert(aiConversations).values({ userId, title: input.message.slice(0, 40), topicId: input.topicId ?? null }).returning())[0]!;
    const history = await this.db.select({ role: aiMessages.role, content: aiMessages.content }).from(aiMessages).where(eq(aiMessages.conversationId, conv.id)).orderBy(desc(aiMessages.createdAt)).limit(10);
    const answer = await this.ai.answer({ message: input.message, topicId: input.topicId ?? conv.topicId ?? undefined, history: history.reverse().map((h) => ({ role: h.role === "assistant" ? "assistant" as const : "user" as const, content: h.content })), context: await this.context(studentId) });
    await this.db.insert(aiMessages).values([{ conversationId: conv.id, role: "user", content: input.message.slice(0, 2000) }, { conversationId: conv.id, role: "assistant", content: answer.text, sources: answer.sources, tokensUsed: answer.tokens }]);
    await this.db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conv.id));
    if (!answer.blocked) await this.progress.recordActivity(studentId, "AI");
    return { conversationId: conv.id, reply: answer.text, sources: answer.sources, blocked: answer.blocked };
  }

  private async context(studentId: string): Promise<StudentContext> {
    const [p] = await this.db.select({ grade: studentProfiles.grade, stream: studentProfiles.stream }).from(studentProfiles).where(eq(studentProfiles.id, studentId));
    const weak = (await this.progress.topicStats(studentId)).filter((t) => t.attempted >= 5 && t.correct / t.attempted < 0.6).map((t) => `${t.subjectName} → ${t.topicName}`);
    const recent = await this.db.select({ title: exams.title, pct: examAttempts.percentage }).from(examAttempts).innerJoin(exams, eq(exams.id, examAttempts.examId)).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.status, "SUBMITTED"))).orderBy(desc(examAttempts.submittedAt)).limit(3);
    return { grade: p?.grade ?? 12, stream: p?.stream, subjects: [], weakTopics: weak, recentScores: recent.map((r) => ({ title: r.title, percentage: Math.round(Number(r.pct)) })) };
  }
}
