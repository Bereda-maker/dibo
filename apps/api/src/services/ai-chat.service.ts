import { and, desc, eq, gte, inArray, ilike, isNull, lt, or, sql } from "drizzle-orm";
import { aiConversations, aiMessages, examAttempts, exams, learningMaterials, notes, studentProfiles, subjects, topics, type Db } from "@dibora/database";
import { DEFAULT_FREE, DEFAULT_PREMIUM, withinDailyLimit } from "@dibora/core/entitlement";
import { AIService, type ContentRetriever, type StudentContext } from "./ai/ai.service";
import type { ProgressService } from "./progress.service";
import { AppError, Errors } from "../utils/errors";

/** Retrieval over published notes within the student's available subject scope. */
export class DbRetriever implements ContentRetriever {
  constructor(private db: Db) {}

  async search(query: string, opts: { topicId?: string; subjectId?: string; subjectIds?: string[]; limit: number }) {
    const words = [...new Set(query.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((word) => word.length > 3))].slice(0, 6);
    if (!words.length || (opts.subjectIds && !opts.subjectIds.length)) return [];
    const match = or(...words.flatMap((word) => [
      ilike(notes.title, `%${word}%`),
      ilike(notes.summary, `%${word}%`),
      sql`${notes.content}::text ilike ${"%" + word + "%"}`,
    ]));
    const rows = await this.db.select({ id: notes.id, title: notes.title, summary: notes.summary, content: notes.content })
      .from(notes)
      .innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId))
      .innerJoin(topics, eq(topics.id, learningMaterials.topicId))
      .innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(
        eq(learningMaterials.status, "PUBLISHED"),
        eq(topics.status, "PUBLISHED"),
        eq(subjects.status, "PUBLISHED"),
        opts.topicId ? eq(learningMaterials.topicId, opts.topicId) : undefined,
        opts.subjectId && !opts.subjectIds?.length ? eq(topics.subjectId, opts.subjectId) : undefined,
        opts.subjectIds?.length ? inArray(topics.subjectId, opts.subjectIds) : undefined,
        match,
      ))
      .limit(opts.limit);
    return rows.map((row) => ({ id: row.id, title: row.title, text: `${row.summary ?? ""}\n${JSON.stringify(row.content).slice(0, 1500)}` }));
  }
}

export type AiFeedback = "HELPFUL" | "NOT_HELPFUL" | null;

export class AiChatService {
  constructor(private db: Db, private ai: AIService, private progress: ProgressService) {}

  list(userId: string, savedOnly = false) {
    return this.db.select({
      id: aiConversations.id,
      title: aiConversations.title,
      updatedAt: aiConversations.updatedAt,
      subjectId: aiConversations.subjectId,
      topicId: aiConversations.topicId,
      isSaved: aiConversations.isSaved,
    }).from(aiConversations)
      .where(and(
        eq(aiConversations.userId, userId),
        isNull(aiConversations.deletedAt),
        savedOnly ? eq(aiConversations.isSaved, true) : undefined,
      ))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(savedOnly ? 100 : 50);
  }

  /** Every lookup is scoped to the owner: another student's conversation id behaves as "not found". */
  private async owned(userId: string, id: string) {
    const [conversation] = await this.db.select().from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId), isNull(aiConversations.deletedAt)))
      .limit(1);
    if (!conversation) throw Errors.notFound("Conversation");
    return conversation;
  }

  private async ownedAssistantMessage(userId: string, id: string) {
    const [message] = await this.db.select({ id: aiMessages.id, conversationId: aiMessages.conversationId, role: aiMessages.role })
      .from(aiMessages)
      .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
      .where(and(eq(aiMessages.id, id), eq(aiConversations.userId, userId), isNull(aiConversations.deletedAt)))
      .limit(1);
    if (!message || message.role !== "assistant") throw Errors.notFound("Assistant message");
    return message;
  }

  async messages(userId: string, id: string) {
    await this.owned(userId, id);
    const rows = await this.db.select({
      id: aiMessages.id,
      role: aiMessages.role,
      content: aiMessages.content,
      sources: aiMessages.sources,
      feedback: aiMessages.feedback,
      isSaved: aiMessages.isSaved,
      isRegeneration: aiMessages.isRegeneration,
      createdAt: aiMessages.createdAt,
    }).from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(aiMessages.createdAt, aiMessages.id);
    const sourceIds = [...new Set(rows.flatMap((message) => message.sources ?? []))];
    const sourceRows = sourceIds.length ? await this.db.select({ id: notes.id, title: notes.title })
      .from(notes)
      .innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId))
      .innerJoin(topics, eq(topics.id, learningMaterials.topicId))
      .innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(inArray(notes.id, sourceIds), eq(learningMaterials.status, "PUBLISHED"), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"))) : [];
    const sourceMap = new Map(sourceRows.map((source) => [source.id, source.title]));
    return rows.map((message) => ({
      ...message,
      sourceDetails: (message.sources ?? []).flatMap((sourceId) => {
        const title = sourceMap.get(sourceId);
        return title ? [{ id: sourceId, title }] : [];
      }),
    }));
  }

  async rename(userId: string, id: string, title: string) {
    await this.owned(userId, id);
    await this.db.update(aiConversations).set({ title: title.slice(0, 80), updatedAt: new Date() }).where(eq(aiConversations.id, id));
  }

  async setConversationSaved(userId: string, id: string, saved: boolean) {
    await this.owned(userId, id);
    await this.db.update(aiConversations).set({ isSaved: saved, updatedAt: new Date() }).where(eq(aiConversations.id, id));
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.db.update(aiConversations).set({ deletedAt: new Date() }).where(eq(aiConversations.id, id));
  }

  async setMessageFeedback(userId: string, id: string, feedback: AiFeedback) {
    await this.ownedAssistantMessage(userId, id);
    await this.db.update(aiMessages).set({ feedback }).where(eq(aiMessages.id, id));
  }

  async setMessageSaved(userId: string, id: string, saved: boolean) {
    const message = await this.ownedAssistantMessage(userId, id);
    await this.db.update(aiMessages).set({ isSaved: saved }).where(eq(aiMessages.id, id));
    if (saved) {
      await this.db.update(aiConversations).set({ isSaved: true, updatedAt: new Date() }).where(eq(aiConversations.id, message.conversationId));
    }
  }

  async send(userId: string, studentId: string, isPremium: boolean, input: {
    conversationId?: string;
    subjectId?: string | null;
    topicId?: string | null;
    message: string;
    regenerate?: boolean;
  }) {
    const existing = input.conversationId ? await this.owned(userId, input.conversationId) : undefined;
    if (input.regenerate && !existing) throw Errors.badRequest("Regeneration requires an existing conversation");

    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    const used = ((await this.db.select({ n: sql<number>`count(*)::int` })
      .from(aiMessages)
      .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
      .where(and(
        eq(aiConversations.userId, userId),
        gte(aiMessages.createdAt, midnight),
        or(eq(aiMessages.role, "user"), and(eq(aiMessages.role, "assistant"), eq(aiMessages.isRegeneration, true))),
      ))) as { n: number }[])[0]!.n;
    if (!withinDailyLimit(isPremium ? DEFAULT_PREMIUM : DEFAULT_FREE, "aiMessagesPerDay", used)) {
      throw new AppError(402, "DAILY_LIMIT", "You have reached today's AI message limit", { feature: "aiMessagesPerDay" });
    }

    const subjectChanged = input.subjectId !== undefined && input.subjectId !== (existing?.subjectId ?? null);
    let requestedSubjectId = input.subjectId !== undefined ? input.subjectId ?? undefined : existing?.subjectId ?? undefined;
    let requestedTopicId = input.topicId !== undefined ? input.topicId ?? undefined : existing?.topicId ?? undefined;
    if (subjectChanged && input.topicId === undefined) requestedTopicId = undefined;
    const resolved = await this.resolveContext(studentId, requestedSubjectId, requestedTopicId);

    const recent = existing ? await this.db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, existing.id))
      .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
      .limit(10) : [];

    let historyRows = recent;
    if (input.regenerate) {
      const latestAssistant = recent[0];
      const [originalUser] = await this.db.select({ content: aiMessages.content, createdAt: aiMessages.createdAt })
        .from(aiMessages)
        .where(and(eq(aiMessages.conversationId, existing!.id), eq(aiMessages.role, "user"), eq(aiMessages.isRegeneration, false)))
        .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
        .limit(1);
      if (latestAssistant?.role !== "assistant" || !originalUser || originalUser.content !== input.message) {
        throw Errors.conflict("Only the most recent response can be regenerated");
      }
      historyRows = await this.db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content })
        .from(aiMessages)
        .where(and(eq(aiMessages.conversationId, existing!.id), lt(aiMessages.createdAt, originalUser.createdAt)))
        .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
        .limit(10);
    }

    const answer = await this.ai.answer({
      message: input.message,
      topicId: resolved.topicId,
      subjectId: resolved.subjectId,
      subjectIds: resolved.allowedSubjectIds,
      history: historyRows.reverse().map((row) => ({ role: row.role === "assistant" ? "assistant" as const : "user" as const, content: row.content })),
      context: resolved.context,
    });

    const now = new Date();
    const conv = await this.db.transaction(async (tx) => {
      const current = existing ?? (await tx.insert(aiConversations).values({
        userId,
        title: input.message.slice(0, 40),
        subjectId: resolved.subjectId ?? null,
        topicId: resolved.topicId ?? null,
      }).returning())[0]!;
      await tx.update(aiConversations).set({
        subjectId: resolved.subjectId ?? null,
        topicId: resolved.topicId ?? null,
        updatedAt: now,
      }).where(eq(aiConversations.id, current.id));
      const messageRows = input.regenerate
        ? [{ conversationId: current.id, role: "assistant" as const, content: answer.text, sources: answer.sources, tokensUsed: answer.tokens, isRegeneration: true, createdAt: new Date(now.getTime() + 1) }]
        : [
          { conversationId: current.id, role: "user" as const, content: input.message.slice(0, 2000), isRegeneration: false, createdAt: now },
          { conversationId: current.id, role: "assistant" as const, content: answer.text, sources: answer.sources, tokensUsed: answer.tokens, isRegeneration: false, createdAt: new Date(now.getTime() + 1) },
        ];
      const inserted = await tx.insert(aiMessages).values(messageRows).returning({ id: aiMessages.id, role: aiMessages.role });
      return { id: current.id, assistantMessageId: inserted.find((item) => item.role === "assistant")!.id };
    });
    if (!answer.blocked) await this.progress.recordActivity(studentId, "AI");
    return { conversationId: conv.id, assistantMessageId: conv.assistantMessageId, reply: answer.text, sources: answer.sources, sourceDetails: answer.sourceDetails, blocked: answer.blocked, isRegeneration: input.regenerate ?? false };
  }

  private async resolveContext(studentId: string, requestedSubjectId?: string, requestedTopicId?: string) {
    const [profile] = await this.db.select({
      grade: studentProfiles.grade,
      stream: studentProfiles.stream,
      selectedSubjectIds: studentProfiles.selectedSubjectIds,
    }).from(studentProfiles).where(eq(studentProfiles.id, studentId)).limit(1);
    if (!profile) throw Errors.forbidden();

    const selectedIds = profile.selectedSubjectIds ?? [];
    let allowedSubjectIds: string[];
    if (selectedIds.length) {
      const selected = await this.db.select({ educationLevel: subjects.educationLevel, slug: subjects.slug, names: subjects.names, stream: subjects.stream })
        .from(subjects).where(inArray(subjects.id, selectedIds));
      const candidates = await this.db.select({ id: subjects.id, educationLevel: subjects.educationLevel, slug: subjects.slug, names: subjects.names, stream: subjects.stream })
        .from(subjects).where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.grade, [9, 10, 11, 12])));
      const cleanName = (subject: { slug: string; names: Record<string, string> }) => (subject.names.en || subject.slug).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
      allowedSubjectIds = candidates.filter((candidate) => selected.some((choice) =>
        choice.educationLevel === candidate.educationLevel &&
        (choice.slug === candidate.slug || cleanName(choice) === cleanName(candidate)) &&
        (choice.stream ? candidate.stream === choice.stream || candidate.stream === null : candidate.stream === null),
      )).map((subject) => subject.id);
    } else {
      const allSubjects = await this.db.select({ id: subjects.id }).from(subjects)
        .where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.grade, [9, 10, 11, 12])));
      allowedSubjectIds = allSubjects.map((subject) => subject.id);
    }

    let subjectId = requestedSubjectId;
    let currentTopic: string | null = null;
    if (requestedTopicId) {
      const [topic] = await this.db.select({
        id: topics.id,
        subjectId: topics.subjectId,
        topicNames: topics.names,
      }).from(topics)
        .innerJoin(subjects, eq(subjects.id, topics.subjectId))
        .where(and(eq(topics.id, requestedTopicId), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED")))
        .limit(1);
      if (!topic) throw Errors.notFound("Topic");
      if (subjectId && subjectId !== topic.subjectId) throw Errors.badRequest("The selected topic does not belong to the selected subject");
      subjectId = topic.subjectId;
      currentTopic = topic.topicNames.en ?? Object.values(topic.topicNames)[0] ?? null;
    }

    let currentSubject: string | null = null;
    if (subjectId) {
      const [subject] = await this.db.select({ id: subjects.id, names: subjects.names })
        .from(subjects)
        .where(and(eq(subjects.id, subjectId), eq(subjects.status, "PUBLISHED"), inArray(subjects.id, allowedSubjectIds)))
        .limit(1);
      if (!subject) throw Errors.notFound("Subject");
      currentSubject = subject.names.en ?? Object.values(subject.names)[0] ?? null;
    }

    const selectedSubjects = selectedIds.length
      ? await this.db.select({ names: subjects.names }).from(subjects).where(and(inArray(subjects.id, selectedIds), eq(subjects.status, "PUBLISHED")))
      : [];
    const subjectNames = [...new Set(selectedSubjects.map((subject) => subject.names.en ?? Object.values(subject.names)[0] ?? "").filter(Boolean))];
    if (currentSubject && !subjectNames.includes(currentSubject)) subjectNames.push(currentSubject);

    const weak = (await this.progress.topicStats(studentId)).filter((topic) => topic.attempted >= 5 && topic.correct / topic.attempted < 0.6).map((topic) => `${topic.subjectName} → ${topic.topicName}`);
    const recent = await this.db.select({ title: exams.title, pct: examAttempts.percentage })
      .from(examAttempts)
      .innerJoin(exams, eq(exams.id, examAttempts.examId))
      .where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.status, "SUBMITTED")))
      .orderBy(desc(examAttempts.submittedAt))
      .limit(3);

    const context: StudentContext = {
      grade: profile.grade,
      stream: profile.stream,
      subjects: subjectNames,
      weakTopics: weak,
      recentScores: recent.map((row) => ({ title: row.title, percentage: Math.round(Number(row.pct)) })),
      currentSubject,
      currentTopic,
    };
    return { subjectId, topicId: requestedTopicId, allowedSubjectIds, context };
  }
}
