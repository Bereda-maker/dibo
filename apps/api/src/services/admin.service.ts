import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { adminAuditLogs, contactMessages, examAttempts, examQuestions, exams, learningMaterials, notes, notifications, payments, questionOptions, questions, studentAnswers, studentProfiles, subjects, subtopics, subscriptionPlans, topics, users, type Db } from "@dibora/database";
import { diagnosticUpsertSchema, questionUpsertSchema } from "@dibora/validation";
import { MIN_RECOMMENDATION_SAMPLE } from "@dibora/core/recommendation";
import type { z } from "zod";
import { rowsOf } from "../utils/rows";
import { Errors, AppError } from "../utils/errors";
import { calculateRevenueAllocation, FINANCE_TIME_ZONE, monthRangeEAT } from "./finance-allocation";

type Actor = { userId: string; ip?: string; requestId?: string };
type QuestionInput = z.infer<typeof questionUpsertSchema>;
type DiagnosticInput = z.infer<typeof diagnosticUpsertSchema>;

export class AdminService {
  constructor(private db: Db) {}
  async actionCounts() {
    const count = (value: { count: number }[] | undefined) => Number(value?.[0]?.count ?? 0);
    const [paymentReviews, contacts, draftSubjects, draftTopics, draftMaterials, draftQuestions, draftExams, draftDiagnostics] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(payments).where(and(eq(payments.status, "PENDING"), sql`${payments.metadata}->>'manualReviewStatus' = 'PENDING'`)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(contactMessages).where(ne(contactMessages.status, "RESOLVED")),
      this.db.select({ count: sql<number>`count(*)::int` }).from(subjects).where(and(eq(subjects.status, "DRAFT"), isNull(subjects.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` }).from(topics).where(and(eq(topics.status, "DRAFT"), isNull(topics.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` }).from(learningMaterials).where(and(eq(learningMaterials.status, "DRAFT"), isNull(learningMaterials.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` }).from(questions).where(and(eq(questions.status, "DRAFT"), isNull(questions.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` }).from(exams).where(and(eq(exams.status, "DRAFT"), ne(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` }).from(exams).where(and(eq(exams.status, "DRAFT"), eq(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))),
    ]);
    const draftCurriculumItems = count(draftSubjects) + count(draftTopics) + count(draftMaterials);
    return { pendingPaymentReviews: count(paymentReviews), unresolvedContacts: count(contacts), draftCurriculumItems, draftQuestions: count(draftQuestions), draftExams: count(draftExams), draftDiagnostics: count(draftDiagnostics) };
  }
  private audit(a: Actor, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
    return this.db.insert(adminAuditLogs).values({ actorId: a.userId, action, targetType, targetId, metadata, ip: a.ip, requestId: a.requestId });
  }

  private async validateDiagnosticQuestions(questionIds: string[]) {
    const rows = questionIds.length ? await this.db.select({ id: questions.id, subjectId: questions.subjectId, topicId: questions.topicId, questionStatus: questions.status,
      topicSubjectId: topics.subjectId, topicStatus: topics.status, subjectStatus: subjects.status })
      .from(questions).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(and(inArray(questions.id, questionIds), isNull(questions.deletedAt), isNull(topics.deletedAt), isNull(subjects.deletedAt))) : [];
    if (rows.length !== questionIds.length || rows.some((q) => q.topicSubjectId !== q.subjectId || q.questionStatus !== "PUBLISHED" || q.topicStatus !== "PUBLISHED" || q.subjectStatus !== "PUBLISHED")) {
      throw new AppError(422, "INVALID_DIAGNOSTIC_QUESTIONS", "Select only published questions whose subject and topic are published and correctly linked");
    }
    return rows;
  }

  private async validateQuestionScope(subjectId: string, topicId: string) {
    const [scope] = await this.db.select({ id: topics.id }).from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(eq(topics.id, topicId), eq(topics.subjectId, subjectId), eq(topics.status, "PUBLISHED"), isNull(topics.deletedAt), eq(subjects.status, "PUBLISHED"), isNull(subjects.deletedAt))).limit(1);
    if (!scope) throw new AppError(422, "INVALID_QUESTION_SCOPE", "Choose a published topic that belongs to the selected subject");
  }

  async diagnosticBuilderData() {
    const [subjectRows, topicRows, questionRows, diagnosticRows] = await Promise.all([
      this.db.select({ id: subjects.id, grade: subjects.grade, stream: subjects.stream, slug: subjects.slug, names: subjects.names })
        .from(subjects).where(and(eq(subjects.status, "PUBLISHED"), isNull(subjects.deletedAt))).orderBy(asc(subjects.sortOrder)),
      this.db.select({ id: topics.id, subjectId: topics.subjectId, slug: topics.slug, names: topics.names })
        .from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId)).where(and(eq(topics.status, "PUBLISHED"), isNull(topics.deletedAt), eq(subjects.status, "PUBLISHED"), isNull(subjects.deletedAt))).orderBy(asc(topics.sortOrder)),
      this.db.select({ id: questions.id, subjectId: questions.subjectId, topicId: questions.topicId, difficulty: questions.difficulty, type: questions.type, text: questions.text, status: questions.status, source: questions.source, createdAt: questions.createdAt,
        subjectNames: subjects.names, subjectSlug: subjects.slug, topicNames: topics.names, topicSlug: topics.slug })
        .from(questions).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(subjects, eq(subjects.id, questions.subjectId))
        .where(and(isNull(questions.deletedAt), isNull(topics.deletedAt), isNull(subjects.deletedAt), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"), or(eq(questions.status, "DRAFT"), eq(questions.status, "PUBLISHED"), eq(questions.status, "ARCHIVED"))))
        .orderBy(asc(subjects.sortOrder), asc(topics.sortOrder), desc(questions.createdAt)),
      this.db.select({ id: exams.id, title: exams.title, description: exams.description, instructions: exams.instructions, durationMinutes: exams.durationMinutes, questionCount: exams.questionCount, randomize: exams.randomize, status: exams.status, createdAt: exams.createdAt })
        .from(exams).where(and(eq(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))).orderBy(desc(exams.createdAt)),
    ]);
    const ids = diagnosticRows.map((e) => e.id);
    const links = ids.length ? await this.db.select({ examId: examQuestions.examId, questionId: questions.id, topicId: questions.topicId, questionStatus: questions.status, topicNames: topics.names, subjectNames: subjects.names })
      .from(examQuestions).innerJoin(questions, eq(questions.id, examQuestions.questionId)).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(inArray(examQuestions.examId, ids)).orderBy(asc(examQuestions.sortOrder)) : [];
    return {
      minimumQuestionsPerTopic: MIN_RECOMMENDATION_SAMPLE,
      subjects: subjectRows,
      topics: topicRows,
      questions: questionRows.map((q) => ({ id: q.id, subjectId: q.subjectId, subjectName: q.subjectNames.en ?? q.subjectSlug, topicId: q.topicId, topicName: q.topicNames.en ?? q.topicSlug, difficulty: q.difficulty, type: q.type, text: q.text, status: q.status, source: q.source, createdAt: q.createdAt })),
      diagnostics: diagnosticRows.map((exam) => {
        const examLinks = links.filter((x) => x.examId === exam.id);
        const coverage = new Map<string, { topicId: string; topicName: string; subjectName: string; count: number }>();
        for (const link of examLinks) if (link.questionStatus === "PUBLISHED") { const value = coverage.get(link.topicId) ?? { topicId: link.topicId, topicName: link.topicNames.en ?? "Topic", subjectName: link.subjectNames.en ?? "Subject", count: 0 }; value.count++; coverage.set(link.topicId, value); }
        return { ...exam, questionIds: examLinks.map((x) => x.questionId), inactiveQuestionCount: examLinks.filter((x) => x.questionStatus !== "PUBLISHED").length, coverage: [...coverage.values()] };
      }),
    };
  }

  async createDiagnostic(a: Actor, input: DiagnosticInput) {
    const selected = await this.validateDiagnosticQuestions(input.questionIds);
    const subjectIds = [...new Set(selected.map((q) => q.subjectId))];
    const [created] = await this.db.transaction(async (tx) => {
      const [exam] = await tx.insert(exams).values({ type: "DIAGNOSTIC", subjectId: subjectIds.length === 1 ? subjectIds[0]! : null, title: input.title,
        description: input.description?.trim() || null, instructions: input.instructions?.trim() || null, durationMinutes: input.durationMinutes,
        questionCount: input.questionIds.length, passingScore: 0, attemptLimit: null, randomize: input.randomize, requiresPremium: false, status: "DRAFT" }).returning({ id: exams.id });
      await tx.insert(examQuestions).values(input.questionIds.map((questionId, sortOrder) => ({ examId: exam!.id, questionId, sortOrder, marks: 1 })));
      return [exam];
    });
    await this.audit(a, "DIAGNOSTIC_CREATED", "exam", created!.id, { questionCount: input.questionIds.length });
    return { id: created!.id, status: "DRAFT", questionCount: input.questionIds.length };
  }

  async updateDiagnostic(a: Actor, id: string, input: DiagnosticInput) {
    const [existing] = await this.db.select({ id: exams.id, status: exams.status }).from(exams).where(and(eq(exams.id, id), eq(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))).limit(1);
    if (!existing) throw Errors.notFound("Diagnostic");
    if (existing.status !== "DRAFT") throw Errors.conflict("Only draft diagnostics can be edited");
    const selected = await this.validateDiagnosticQuestions(input.questionIds);
    const subjectIds = [...new Set(selected.map((q) => q.subjectId))];
    await this.db.transaction(async (tx) => {
      await tx.update(exams).set({ subjectId: subjectIds.length === 1 ? subjectIds[0]! : null, title: input.title, description: input.description?.trim() || null,
        instructions: input.instructions?.trim() || null, durationMinutes: input.durationMinutes, questionCount: input.questionIds.length, randomize: input.randomize, updatedAt: new Date() }).where(eq(exams.id, id));
      await tx.delete(examQuestions).where(eq(examQuestions.examId, id));
      await tx.insert(examQuestions).values(input.questionIds.map((questionId, sortOrder) => ({ examId: id, questionId, sortOrder, marks: 1 })));
    });
    await this.audit(a, "DIAGNOSTIC_UPDATED", "exam", id, { questionCount: input.questionIds.length });
    return { id, status: "DRAFT", questionCount: input.questionIds.length };
  }

  async publishDiagnostic(a: Actor, id: string) {
    const [exam] = await this.db.select({ id: exams.id, questionCount: exams.questionCount, status: exams.status }).from(exams)
      .where(and(eq(exams.id, id), eq(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))).limit(1);
    if (!exam) throw Errors.notFound("Diagnostic");
    const rows = await this.db.select({ questionId: questions.id, topicId: questions.topicId, questionStatus: questions.status, topicStatus: topics.status, subjectStatus: subjects.status,
      topicName: topics.names, subjectName: subjects.names, topicSubjectId: topics.subjectId, questionSubjectId: questions.subjectId })
      .from(examQuestions).innerJoin(questions, eq(questions.id, examQuestions.questionId)).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(and(eq(examQuestions.examId, id), isNull(questions.deletedAt), isNull(topics.deletedAt), isNull(subjects.deletedAt)));
    if (!rows.length || rows.length !== exam.questionCount || rows.some((q) => q.questionStatus !== "PUBLISHED" || q.topicStatus !== "PUBLISHED" || q.subjectStatus !== "PUBLISHED" || q.topicSubjectId !== q.questionSubjectId)) {
      throw new AppError(422, "DIAGNOSTIC_QUESTIONS_INVALID", "All diagnostic questions must still be published and correctly linked");
    }
    const byTopic = new Map<string, { topicId: string; topicName: string; subjectName: string; count: number }>();
    for (const row of rows) { const value = byTopic.get(row.topicId) ?? { topicId: row.topicId, topicName: row.topicName.en ?? "Topic", subjectName: row.subjectName.en ?? "Subject", count: 0 }; value.count++; byTopic.set(row.topicId, value); }
    const gaps = [...byTopic.values()].filter((topic) => topic.count < MIN_RECOMMENDATION_SAMPLE);
    if (gaps.length) throw new AppError(422, "DIAGNOSTIC_COVERAGE", `Add at least ${MIN_RECOMMENDATION_SAMPLE} questions for every included topic before publishing`, { minimumQuestionsPerTopic: MIN_RECOMMENDATION_SAMPLE, topics: gaps.map((topic) => ({ ...topic, moreNeeded: MIN_RECOMMENDATION_SAMPLE - topic.count })) });
    const [otherPublished] = await this.db.select({ id: exams.id }).from(exams).where(and(eq(exams.type, "DIAGNOSTIC"), eq(exams.status, "PUBLISHED"), isNull(exams.deletedAt), ne(exams.id, id))).limit(1);
    if (otherPublished) throw new AppError(409, "DIAGNOSTIC_ALREADY_PUBLISHED", "Unpublish the current diagnostic before publishing another one");
    await this.db.update(exams).set({ status: "PUBLISHED", updatedAt: new Date() }).where(eq(exams.id, id));
    await this.audit(a, "DIAGNOSTIC_PUBLISHED", "exam", id, { questionCount: rows.length, topicCount: byTopic.size });
    return { id, status: "PUBLISHED", questionCount: rows.length, topicCount: byTopic.size };
  }

  async unpublishDiagnostic(a: Actor, id: string) {
    const [exam] = await this.db.select({ id: exams.id, status: exams.status }).from(exams).where(and(eq(exams.id, id), eq(exams.type, "DIAGNOSTIC"), isNull(exams.deletedAt))).limit(1);
    if (!exam) throw Errors.notFound("Diagnostic");
    if (exam.status === "PUBLISHED") { await this.db.update(exams).set({ status: "DRAFT", updatedAt: new Date() }).where(eq(exams.id, id)); await this.audit(a, "DIAGNOSTIC_UNPUBLISHED", "exam", id); }
    return { id, status: exam.status === "PUBLISHED" ? "DRAFT" : exam.status };
  }

  /** Student list deliberately omits email, phone, school and any AI conversation content. */
  async students(f: { q?: string; status?: "ACTIVE" | "SUSPENDED"; limit: number; offset: number }) {
    const conds = [isNull(users.deletedAt), f.q ? or(ilike(studentProfiles.fullName, `%${f.q.replace(/[%_]/g, "")}%`), ilike(studentProfiles.region, `%${f.q.replace(/[%_]/g, "")}%`)) : undefined, f.status ? eq(users.isActive, f.status === "ACTIVE") : undefined].filter(Boolean) as never[];
    return this.db.select({ id: studentProfiles.id, userId: users.id, name: studentProfiles.fullName, region: studentProfiles.region, grade: studentProfiles.grade, learningStatus: studentProfiles.learningStatus, subscriptionStatus: studentProfiles.subscriptionStatus, active: users.isActive, joinedAt: users.createdAt })
      .from(studentProfiles).innerJoin(users, eq(users.id, studentProfiles.userId)).where(and(...conds)).orderBy(desc(users.createdAt)).limit(f.limit).offset(f.offset);
  }
  async setActive(a: Actor, userId: string, active: boolean) {
    const [u] = await this.db.select({ role: users.role }).from(users).where(eq(users.id, userId)); if (!u) throw Errors.notFound("User");
    if (u.role !== "STUDENT") throw Errors.forbidden(); // admins cannot suspend other admins here
    await this.db.update(users).set({ isActive: active, updatedAt: new Date() }).where(eq(users.id, userId));
    await this.audit(a, active ? "STUDENT_ACTIVATED" : "STUDENT_SUSPENDED", "user", userId);
  }
  async deleteStudent(a: Actor, userId: string) {
    const [u] = await this.db.select({ role: users.role }).from(users).where(eq(users.id, userId)); if (!u || u.role !== "STUDENT") throw Errors.notFound("Student");
    await this.db.transaction(async (tx) => { const now = new Date(); await tx.update(users).set({ deletedAt: now, isActive: false }).where(eq(users.id, userId)); await tx.update(studentProfiles).set({ deletedAt: now }).where(eq(studentProfiles.userId, userId)); });
    await this.audit(a, "STUDENT_DELETED", "user", userId);
  }

  async createQuestion(a: Actor, input: QuestionInput) {
    await this.validateQuestionScope(input.subjectId, input.topicId);
    const id = await this.db.transaction(async (tx) => {
      const [q] = await tx.insert(questions).values({ subjectId: input.subjectId, topicId: input.topicId, subtopicId: input.subtopicId ?? null, difficulty: input.difficulty, type: input.type, text: input.text, explanation: input.explanation, numericAnswer: input.numericAnswer == null ? null : String(input.numericAnswer), numericTolerance: String(input.numericTolerance), tags: input.tags, source: input.source ?? null, status: "DRAFT" }).returning({ id: questions.id });
      if (input.options.length) await tx.insert(questionOptions).values(input.options.map((o, i) => ({ questionId: q!.id, text: o.text, isCorrect: o.isCorrect, sortOrder: i })));
      return q!.id;
    });
    await this.audit(a, "QUESTION_CREATED", "question", id); return { id };
  }

  async listQuestions(f: { q?: string; subjectId?: string; topicId?: string; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; limit: number; offset: number }) {
    const query = f.q?.replace(/[%_]/g, "");
    const where = and(isNull(questions.deletedAt), f.subjectId ? eq(questions.subjectId, f.subjectId) : undefined,
      f.topicId ? eq(questions.topicId, f.topicId) : undefined, f.status ? eq(questions.status, f.status) : undefined,
      query ? ilike(questions.text, `%${query}%`) : undefined);
    const [items, totalRows] = await Promise.all([
      this.db.select({ id: questions.id, subjectId: questions.subjectId, topicId: questions.topicId, subtopicId: questions.subtopicId,
        difficulty: questions.difficulty, type: questions.type, text: questions.text, explanation: questions.explanation,
        numericAnswer: questions.numericAnswer, numericTolerance: questions.numericTolerance, tags: questions.tags,
        source: questions.source, status: questions.status, createdAt: questions.createdAt, updatedAt: questions.updatedAt,
        subjectNames: subjects.names, subjectSlug: subjects.slug, topicNames: topics.names, topicSlug: topics.slug })
        .from(questions).innerJoin(subjects, eq(subjects.id, questions.subjectId)).innerJoin(topics, eq(topics.id, questions.topicId))
        .where(where).orderBy(desc(questions.createdAt)).limit(f.limit).offset(f.offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(questions).where(where),
    ]);
    const optionRows = items.length ? await this.db.select().from(questionOptions).where(inArray(questionOptions.questionId, items.map((row) => row.id))).orderBy(asc(questionOptions.sortOrder)) : [];
    return { items: items.map(({ subjectNames, subjectSlug, topicNames, topicSlug, ...row }) => ({ ...row,
      subjectName: subjectNames.en ?? subjectSlug, topicName: topicNames.en ?? topicSlug,
      options: optionRows.filter((option) => option.questionId === row.id).map(({ questionId: _questionId, ...option }) => option),
    })), total: Number(totalRows[0]?.count ?? 0), limit: f.limit, offset: f.offset };
  }

  async curriculum() {
    const [subjectRows, topicRows, materialRows] = await Promise.all([
      this.db.select().from(subjects).where(isNull(subjects.deletedAt)).orderBy(asc(subjects.sortOrder), asc(subjects.createdAt)),
      this.db.select({ id: topics.id, subjectId: topics.subjectId, slug: topics.slug, names: topics.names, sortOrder: topics.sortOrder, status: topics.status, createdAt: topics.createdAt, subjectNames: subjects.names, subjectSlug: subjects.slug })
        .from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId)).where(isNull(topics.deletedAt)).orderBy(asc(subjects.sortOrder), asc(topics.sortOrder)),
      this.db.select({ id: learningMaterials.id, topicId: learningMaterials.topicId, subtopicId: learningMaterials.subtopicId,
        kind: learningMaterials.kind, status: learningMaterials.status, createdAt: learningMaterials.createdAt,
        noteId: notes.id, locale: notes.locale, title: notes.title, summary: notes.summary, content: notes.content,
        topicNames: topics.names, topicSlug: topics.slug, subjectNames: subjects.names, subjectSlug: subjects.slug })
        .from(learningMaterials).innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
        .leftJoin(notes, eq(notes.materialId, learningMaterials.id)).where(isNull(learningMaterials.deletedAt)).orderBy(desc(learningMaterials.createdAt)),
    ]);
    return { subjects: subjectRows, topics: topicRows.map(({ subjectNames, subjectSlug, ...row }) => ({ ...row, subjectName: subjectNames.en ?? subjectSlug })),
      materials: materialRows.map(({ topicNames, topicSlug, subjectNames, subjectSlug, ...row }) => ({ ...row,
        topicName: topicNames.en ?? topicSlug, subjectName: subjectNames.en ?? subjectSlug })),
    };
  }

  async createSubject(a: Actor, input: { educationLevel: string; grade: number; stream?: string | null; slug: string; names: Record<string, string>; sortOrder: number }) {
    const [row] = await this.db.insert(subjects).values({ ...input, stream: input.stream || null, status: "DRAFT" }).returning({ id: subjects.id });
    await this.audit(a, "SUBJECT_CREATED", "subject", row!.id); return { id: row!.id };
  }
  async createTopic(a: Actor, input: { subjectId: string; slug: string; names: Record<string, string>; sortOrder: number }) {
    const [subject] = await this.db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, input.subjectId), isNull(subjects.deletedAt))).limit(1);
    if (!subject) throw Errors.notFound("Subject");
    const [row] = await this.db.insert(topics).values({ ...input, status: "DRAFT" }).returning({ id: topics.id });
    await this.audit(a, "TOPIC_CREATED", "topic", row!.id); return { id: row!.id };
  }
  async createMaterial(a: Actor, input: { topicId: string; subtopicId?: string | null; kind: string; locale: string; title: string; summary?: string; content: Record<string, unknown> }) {
    const [topic] = await this.db.select({ id: topics.id }).from(topics).where(and(eq(topics.id, input.topicId), isNull(topics.deletedAt))).limit(1);
    if (!topic) throw Errors.notFound("Topic");
    if (input.subtopicId) {
      const [subtopic] = await this.db.select({ id: subtopics.id }).from(subtopics).where(and(eq(subtopics.id, input.subtopicId), eq(subtopics.topicId, input.topicId), isNull(subtopics.deletedAt))).limit(1);
      if (!subtopic) throw new AppError(422, "INVALID_SUBTOPIC", "The selected subtopic does not belong to this topic");
    }
    const created = await this.db.transaction(async (tx) => {
      const [material] = await tx.insert(learningMaterials).values({ topicId: input.topicId, subtopicId: input.subtopicId || null, kind: input.kind, status: "DRAFT" }).returning({ id: learningMaterials.id });
      const [note] = await tx.insert(notes).values({ materialId: material!.id, locale: input.locale, title: input.title, summary: input.summary || null, content: input.content }).returning({ id: notes.id });
      return { materialId: material!.id, noteId: note!.id };
    });
    await this.audit(a, "MATERIAL_CREATED", "learning_material", created.materialId); return created;
  }
  async setCurriculumStatus(a: Actor, kind: "subject" | "topic" | "material", id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    if (status === "PUBLISHED" && kind === "topic") {
      const [row] = await this.db.select({ subjectStatus: subjects.status }).from(topics).innerJoin(subjects, eq(subjects.id, topics.subjectId))
        .where(and(eq(topics.id, id), isNull(topics.deletedAt), isNull(subjects.deletedAt))).limit(1);
      if (!row) throw Errors.notFound("Topic");
      if (row.subjectStatus !== "PUBLISHED") throw new AppError(422, "PARENT_NOT_PUBLISHED", "Publish the parent subject before publishing its topic");
    }
    if (status === "PUBLISHED" && kind === "material") {
      const [row] = await this.db.select({ topicStatus: topics.status, subjectStatus: subjects.status }).from(learningMaterials)
        .innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
        .where(and(eq(learningMaterials.id, id), isNull(learningMaterials.deletedAt), isNull(topics.deletedAt), isNull(subjects.deletedAt))).limit(1);
      if (!row) throw Errors.notFound("Learning material");
      if (row.topicStatus !== "PUBLISHED" || row.subjectStatus !== "PUBLISHED") throw new AppError(422, "PARENT_NOT_PUBLISHED", "Publish the parent subject and topic before publishing this material");
    }
    const table = kind === "subject" ? subjects : kind === "topic" ? topics : learningMaterials;
    const idColumn = kind === "subject" ? subjects.id : kind === "topic" ? topics.id : learningMaterials.id;
    const [updated] = await this.db.update(table).set({ status, updatedAt: new Date() }).where(and(eq(idColumn, id), isNull(table.deletedAt))).returning({ id: idColumn });
    if (!updated) throw Errors.notFound(kind);
    await this.audit(a, `${kind.toUpperCase()}_STATUS_${status}`, kind, id, { status });
  }

  async listExams(f: { q?: string; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; limit: number; offset: number }) {
    const where = and(isNull(exams.deletedAt), ne(exams.type, "DIAGNOSTIC"), f.status ? eq(exams.status, f.status) : undefined,
      f.q ? ilike(exams.title, `%${f.q.replace(/[%_]/g, "")}%`) : undefined);
    const [items, count] = await Promise.all([
      this.db.select({ id: exams.id, type: exams.type, subjectId: exams.subjectId, title: exams.title, description: exams.description,
        instructions: exams.instructions, durationMinutes: exams.durationMinutes, questionCount: exams.questionCount,
        passingScore: exams.passingScore, difficulty: exams.difficulty, attemptLimit: exams.attemptLimit,
        randomize: exams.randomize, requiresPremium: exams.requiresPremium, status: exams.status, createdAt: exams.createdAt })
        .from(exams).where(where).orderBy(desc(exams.createdAt)).limit(f.limit).offset(f.offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(exams).where(where),
    ]);
    const ids = items.map((item) => item.id);
    const links = ids.length ? await this.db.select({ examId: examQuestions.examId, questionId: examQuestions.questionId, sortOrder: examQuestions.sortOrder }).from(examQuestions).where(inArray(examQuestions.examId, ids)).orderBy(asc(examQuestions.sortOrder)) : [];
    const attempts = ids.length ? await this.db.select({ examId: examAttempts.examId, total: sql<number>`count(*)::int`, submitted: sql<number>`count(*) filter (where ${examAttempts.status} = 'SUBMITTED')::int` })
      .from(examAttempts).where(inArray(examAttempts.examId, ids)).groupBy(examAttempts.examId) : [];
    return { items: items.map((item) => ({ ...item, questionIds: links.filter((link) => link.examId === item.id).map((link) => link.questionId),
      attempts: Number(attempts.find((attempt) => attempt.examId === item.id)?.total ?? 0), completedAttempts: Number(attempts.find((attempt) => attempt.examId === item.id)?.submitted ?? 0) })),
      total: Number(count[0]?.count ?? 0), limit: f.limit, offset: f.offset };
  }
  async createExam(a: Actor, input: { type: "PRACTICE" | "TOPIC" | "SUBJECT" | "MOCK"; subjectId?: string | null; title: string; description?: string; instructions?: string; durationMinutes: number; passingScore: number; difficulty?: "EASY" | "MEDIUM" | "HARD" | null; attemptLimit?: number | null; randomize: boolean; requiresPremium: boolean; questionIds: string[] }) {
    if (new Set(input.questionIds).size !== input.questionIds.length) throw new AppError(422, "DUPLICATE_QUESTIONS", "An exam cannot include a question more than once");
    const eligible = input.questionIds.length ? await this.db.select({ id: questions.id, subjectId: questions.subjectId, status: questions.status }).from(questions).where(and(inArray(questions.id, input.questionIds), eq(questions.status, "PUBLISHED"), isNull(questions.deletedAt))) : [];
    if (eligible.length !== input.questionIds.length) throw new AppError(422, "INVALID_EXAM_QUESTIONS", "Select only published, active questions");
    if (input.subjectId && eligible.some((question) => question.subjectId !== input.subjectId)) throw new AppError(422, "INVALID_EXAM_SCOPE", "All selected questions must belong to the chosen subject");
    const examId = await this.db.transaction(async (tx) => {
      const [exam] = await tx.insert(exams).values({ type: input.type, subjectId: input.subjectId || null, title: input.title,
        description: input.description || null, instructions: input.instructions || null, durationMinutes: input.durationMinutes,
        questionCount: input.questionIds.length, passingScore: input.passingScore, difficulty: input.difficulty || null,
        attemptLimit: input.attemptLimit ?? null, randomize: input.randomize, requiresPremium: input.requiresPremium, status: "DRAFT" }).returning({ id: exams.id });
      if (input.questionIds.length) await tx.insert(examQuestions).values(input.questionIds.map((questionId, sortOrder) => ({ examId: exam!.id, questionId, sortOrder, marks: 1 })));
      return exam!.id;
    });
    await this.audit(a, "EXAM_CREATED", "exam", examId, { type: input.type, questionCount: input.questionIds.length }); return { id: examId };
  }
  async setExamStatus(a: Actor, id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    const [exam] = await this.db.select().from(exams).where(and(eq(exams.id, id), isNull(exams.deletedAt))).limit(1);
    if (!exam) throw Errors.notFound("Exam");
    if (exam.type === "DIAGNOSTIC") throw new AppError(422, "DIAGNOSTIC_WORKFLOW_REQUIRED", "Manage diagnostic assessments in the Diagnostic Builder so coverage checks are enforced");
    if (exam.status !== "DRAFT" && status === "DRAFT") throw new AppError(409, "EXAM_LOCKED", "Published exams cannot be returned to draft; archive the exam instead");
    if (status === "PUBLISHED") {
      const rows = await this.db.select({ questionId: questions.id, questionStatus: questions.status, topicStatus: topics.status, subjectStatus: subjects.status })
        .from(examQuestions).innerJoin(questions, eq(questions.id, examQuestions.questionId)).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(subjects, eq(subjects.id, questions.subjectId))
        .where(and(eq(examQuestions.examId, id), isNull(questions.deletedAt), isNull(topics.deletedAt), isNull(subjects.deletedAt)));
      if (rows.length !== exam.questionCount || rows.some((row) => row.questionStatus !== "PUBLISHED" || row.topicStatus !== "PUBLISHED" || row.subjectStatus !== "PUBLISHED")) throw new AppError(422, "EXAM_QUESTIONS_INVALID", "All exam questions, topics, and subjects must still be published");
    }
    await this.db.update(exams).set({ status, updatedAt: new Date() }).where(eq(exams.id, id));
    await this.audit(a, `EXAM_${status}`, "exam", id);
  }
  async examResults(f: { examId?: string; limit: number; offset: number }) {
    const where = and(eq(examAttempts.status, "SUBMITTED"), f.examId ? eq(examAttempts.examId, f.examId) : undefined, isNull(studentProfiles.deletedAt), isNull(users.deletedAt));
    const [items, count] = await Promise.all([
      this.db.select({ id: examAttempts.id, examId: examAttempts.examId, examTitle: exams.title, studentId: studentProfiles.id,
        studentName: studentProfiles.fullName, startedAt: examAttempts.startedAt, submittedAt: examAttempts.submittedAt,
        score: examAttempts.score, maxScore: examAttempts.maxScore, percentage: examAttempts.percentage })
        .from(examAttempts).innerJoin(exams, eq(exams.id, examAttempts.examId)).innerJoin(studentProfiles, eq(studentProfiles.id, examAttempts.studentId))
        .innerJoin(users, eq(users.id, studentProfiles.userId)).where(where).orderBy(desc(examAttempts.submittedAt)).limit(f.limit).offset(f.offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(examAttempts).innerJoin(studentProfiles, eq(studentProfiles.id, examAttempts.studentId))
        .innerJoin(users, eq(users.id, studentProfiles.userId)).where(where),
    ]);
    return { items, total: Number(count[0]?.count ?? 0), limit: f.limit, offset: f.offset };
  }

  async analytics(rangeDays: number) {
    const days = [7, 30, 90].includes(rangeDays) ? rangeDays : 30;
    const result = await this.db.execute(sql`
      WITH scoped_answers AS (
        SELECT sa.question_id, sa.is_correct, sa.answered_at, q.topic_id, q.subject_id
        FROM student_answers sa JOIN questions q ON q.id = sa.question_id
        JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
        WHERE sa.answered_at >= now() - (${days}::int * interval '1 day') AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.role = 'STUDENT'
      )
      SELECT (SELECT count(*)::int FROM scoped_answers) AS answers,
        (SELECT count(*)::int FROM exam_attempts ea JOIN student_profiles sp ON sp.id=ea.student_id JOIN users u ON u.id=sp.user_id WHERE ea.started_at >= now()-(${days}::int * interval '1 day') AND ea.status='SUBMITTED' AND sp.deleted_at IS NULL AND u.deleted_at IS NULL) AS completed_exams,
        (SELECT round(avg(percentage)::numeric,1) FROM exam_attempts ea JOIN student_profiles sp ON sp.id=ea.student_id JOIN users u ON u.id=sp.user_id WHERE ea.started_at >= now()-(${days}::int * interval '1 day') AND ea.status='SUBMITTED' AND sp.deleted_at IS NULL AND u.deleted_at IS NULL) AS average_exam_score,
        (SELECT count(*)::int FROM users WHERE role='STUDENT' AND deleted_at IS NULL AND created_at >= now()-(${days}::int * interval '1 day')) AS new_students,
        (SELECT count(*)::int FROM student_profiles sp JOIN users u ON u.id=sp.user_id WHERE sp.subscription_status='PREMIUM' AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.role='STUDENT') AS premium_students,
        (SELECT count(*)::int FROM subscriptions WHERE status='ACTIVE') AS active_subscriptions,
        (SELECT coalesce(sum(amount_minor),0)::bigint FROM payments WHERE status='VERIFIED' AND verified_at >= now()-(${days}::int * interval '1 day')) AS verified_revenue_minor,
        (SELECT count(*)::int FROM ai_messages m JOIN ai_conversations c ON c.id=m.conversation_id JOIN users u ON u.id=c.user_id WHERE m.role='user' AND m.created_at >= now()-(${days}::int * interval '1 day') AND u.role='STUDENT' AND u.deleted_at IS NULL AND c.deleted_at IS NULL) AS ai_requests
    `);
    const summary = rowsOf<Record<string, string | number | null>>(result)[0] ?? {};
    const topicsWithAccuracy = rowsOf<Record<string, string | number | null>>(await this.db.execute(sql`
      SELECT COALESCE(t.names->>'en',t.slug) AS topic, COALESCE(s.names->>'en',s.slug) AS subject,
        count(*)::int AS attempts, round(avg(CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END)::numeric,1) AS accuracy
      FROM student_answers sa JOIN questions q ON q.id=sa.question_id JOIN topics t ON t.id=q.topic_id JOIN subjects s ON s.id=q.subject_id
      JOIN student_profiles sp ON sp.id=sa.student_id JOIN users u ON u.id=sp.user_id
      WHERE sa.answered_at >= now()-(${days}::int * interval '1 day') AND sp.deleted_at IS NULL AND u.deleted_at IS NULL
      GROUP BY t.id,t.names,t.slug,s.names,s.slug HAVING count(*) >= 3 ORDER BY avg(CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END) ASC LIMIT 8
    `)).map((row) => ({ topic: String(row.topic), subject: String(row.subject), attempts: Number(row.attempts), accuracy: Number(row.accuracy ?? 0) }));
    return { rangeDays: days, generatedAt: new Date().toISOString(), summary: {
      answers: Number(summary.answers ?? 0), completedExams: Number(summary.completed_exams ?? 0), averageExamScore: summary.average_exam_score === null ? null : Number(summary.average_exam_score ?? 0),
      newStudents: Number(summary.new_students ?? 0), premiumStudents: Number(summary.premium_students ?? 0), activeSubscriptions: Number(summary.active_subscriptions ?? 0),
      verifiedRevenueMinor: Number(summary.verified_revenue_minor ?? 0), aiRequests: Number(summary.ai_requests ?? 0),
    }, topicsWithAccuracy };
  }

  async monthlyFinance(month: string) {
    const { start, end } = monthRangeEAT(month);
    const rows = await this.db.select({
      currency: payments.currency,
      totalMinor: sql<string>`coalesce(sum(${payments.amountMinor}), 0)::text`,
      verifiedPaymentCount: sql<string>`count(*)::text`,
    }).from(payments)
      .where(and(eq(payments.status, "VERIFIED"), gte(payments.verifiedAt, start), lt(payments.verifiedAt, end)))
      .groupBy(payments.currency).orderBy(asc(payments.currency));
    return {
      month,
      timeZone: FINANCE_TIME_ZONE,
      currencies: rows.map((row) => {
        const grossMinor = Number(row.totalMinor);
        return { currency: row.currency, verifiedPaymentCount: Number(row.verifiedPaymentCount), ...calculateRevenueAllocation(grossMinor) };
      }),
    };
  }

  listPlans() { return this.db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.priceMinor)); }
  listNotifications(limit: number) {
    return this.db.select({ id: sql<string>`min(${notifications.id}::text)`, type: notifications.type, channel: notifications.channel, title: notifications.title,
      body: notifications.body, createdAt: notifications.createdAt, recipientCount: sql<number>`count(*)::int` })
      .from(notifications).groupBy(notifications.type, notifications.channel, notifications.title, notifications.body, notifications.createdAt)
      .orderBy(desc(notifications.createdAt)).limit(limit);
  }
  async broadcastNotification(a: Actor, input: { title: string; body: string }) {
    const recipients = await this.db.select({ id: users.id }).from(users).where(and(eq(users.role, "STUDENT"), eq(users.isActive, true), isNull(users.deletedAt)));
    const sentAt = new Date();
    await this.db.transaction(async (tx) => {
      for (let start = 0; start < recipients.length; start += 500) {
        const batch = recipients.slice(start, start + 500);
        if (batch.length) await tx.insert(notifications).values(batch.map((user) => ({ userId: user.id, type: "ANNOUNCEMENT", channel: "IN_APP", title: input.title, body: input.body, data: { audience: "ALL_ACTIVE_STUDENTS" }, createdAt: sentAt })));
      }
    });
    await this.audit(a, "NOTIFICATION_BROADCAST", "notification", "all-active-students", { recipients: recipients.length });
    return { recipientCount: recipients.length };
  }
  /** Publishing re-validates from stored data so a half-edited draft can never go live. */
  async setQuestionStatus(a: Actor, id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    const [q] = await this.db.select().from(questions).where(and(eq(questions.id, id), isNull(questions.deletedAt))); if (!q) throw Errors.notFound("Question");
    if (status === "PUBLISHED") {
      await this.validateQuestionScope(q.subjectId, q.topicId);
      const opts = await this.db.select().from(questionOptions).where(eq(questionOptions.questionId, id));
      const check = questionUpsertSchema.safeParse({ subjectId: q.subjectId, topicId: q.topicId, difficulty: q.difficulty, type: q.type, text: q.text, explanation: q.explanation, options: opts.map((o) => ({ text: o.text, isCorrect: o.isCorrect })), numericAnswer: q.numericAnswer == null ? null : Number(q.numericAnswer), numericTolerance: Number(q.numericTolerance) });
      if (!check.success) throw new AppError(422, "INVALID_QUESTION", "Question is incomplete and cannot be published", check.error.flatten());
    }
    await this.db.update(questions).set({ status, updatedAt: new Date() }).where(eq(questions.id, id));
    await this.audit(a, `QUESTION_${status}`, "question", id);
  }
  async updatePlan(a: Actor, code: string, patch: { priceMinor?: number; names?: Record<string, string>; isActive?: boolean }) {
    const [p] = await this.db.update(subscriptionPlans).set({ ...patch, updatedAt: new Date() }).where(eq(subscriptionPlans.code, code)).returning({ id: subscriptionPlans.id });
    if (!p) throw Errors.notFound("Plan"); await this.audit(a, "PLAN_UPDATED", "plan", code, patch as Record<string, unknown>);
  }
  auditLog(limit = 100) { return this.db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit); }
  listContactMessages(limit = 50, offset = 0, status?: "NEW" | "READ" | "RESOLVED" | "OPEN") {
    return this.db.select({ id: contactMessages.id, name: contactMessages.name, email: contactMessages.email, message: contactMessages.message, status: contactMessages.status, createdAt: contactMessages.createdAt })
      .from(contactMessages).where(status === "OPEN" ? inArray(contactMessages.status, ["NEW", "READ"]) : status ? eq(contactMessages.status, status) : undefined).orderBy(desc(contactMessages.createdAt)).limit(limit).offset(offset);
  }
  async setContactMessageStatus(a: Actor, id: string, status: "NEW" | "READ" | "RESOLVED") {
    const [updated] = await this.db.update(contactMessages).set({ status, updatedAt: new Date() }).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
    if (!updated) throw Errors.notFound("Contact message");
    await this.audit(a, "CONTACT_MESSAGE_STATUS_UPDATED", "contact_message", id, { status });
  }
  async overview(requestedRange = 30) {
    const rangeDays = [7, 30, 90].includes(requestedRange) ? requestedRange : 30;
    const daysBack = rangeDays - 1;
    const periodStart = new Date();
    periodStart.setUTCHours(0, 0, 0, 0);
    periodStart.setUTCDate(periodStart.getUTCDate() - daysBack);
    const periodStartDate = periodStart.toISOString().slice(0, 10);
    const periodStartTimestamp = periodStart.toISOString();
    const [rawSummary] = rowsOf<Record<string, number>>(await this.db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users u WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL)::int AS students,
        (SELECT COUNT(DISTINCT ss.student_id) FROM study_sessions ss
          JOIN student_profiles sp ON sp.id = ss.student_id JOIN users u ON u.id = sp.user_id
          WHERE ss.day >= (${periodStartDate}::date) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.is_active)::int AS active_learners,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL AND u.created_at >= (${periodStartTimestamp}::timestamptz))::int AS new_students,
        (SELECT COUNT(*) FROM student_profiles sp JOIN users u ON u.id = sp.user_id
          WHERE sp.subscription_status = 'PREMIUM' AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.role = 'STUDENT')::int AS premium,
        (SELECT COUNT(*) FROM exam_attempts ea JOIN student_profiles sp ON sp.id = ea.student_id JOIN users u ON u.id = sp.user_id
          WHERE ea.started_at >= (${periodStartTimestamp}::timestamptz) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL)::int AS exam_attempts,
        (SELECT COUNT(*) FROM student_answers sa JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
          WHERE sa.answered_at >= (${periodStartTimestamp}::timestamptz) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL)::int AS answers,
        (SELECT COUNT(*) FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id JOIN users u ON u.id = c.user_id
          WHERE m.role = 'user' AND m.created_at >= (${periodStartTimestamp}::timestamptz) AND u.role = 'STUDENT' AND u.deleted_at IS NULL AND c.deleted_at IS NULL)::int AS ai_requests,
        (SELECT COUNT(*) FROM contact_messages WHERE status <> 'RESOLVED')::int AS unresolved_contacts,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'NEW')::int AS new_contacts,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL AND NOT u.is_active)::int AS suspended_students,
        (SELECT COUNT(*) FROM questions q WHERE q.status = 'PUBLISHED' AND q.deleted_at IS NULL)::int AS published_questions,
        (SELECT COUNT(*) FROM questions q WHERE q.status = 'DRAFT' AND q.deleted_at IS NULL)::int AS draft_questions
    `));

    const trendRows = rowsOf<Record<string, string | number>>(await this.db.execute(sql`
      WITH days AS (
        SELECT (${periodStartDate}::date + g.n)::date AS day FROM generate_series(0, ${daysBack}) AS g(n)
      ),
      signups AS (
        SELECT u.created_at::date AS day, COUNT(*)::int AS value FROM users u
        WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL AND u.created_at >= (${periodStartTimestamp}::timestamptz) GROUP BY 1
      ),
      learners AS (
        SELECT ss.day, COUNT(DISTINCT ss.student_id)::int AS value FROM study_sessions ss
        JOIN student_profiles sp ON sp.id = ss.student_id JOIN users u ON u.id = sp.user_id
        WHERE ss.day >= (${periodStartDate}::date) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.is_active GROUP BY ss.day
      ),
      attempts AS (
        SELECT ea.started_at::date AS day, COUNT(*)::int AS value FROM exam_attempts ea
        JOIN student_profiles sp ON sp.id = ea.student_id JOIN users u ON u.id = sp.user_id
        WHERE ea.started_at >= (${periodStartTimestamp}::timestamptz) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL GROUP BY 1
      ),
      answers AS (
        SELECT sa.answered_at::date AS day, COUNT(*)::int AS value FROM student_answers sa
        JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
        WHERE sa.answered_at >= (${periodStartTimestamp}::timestamptz) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL GROUP BY 1
      )
      SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date, TO_CHAR(d.day, 'Mon DD') AS label,
        COALESCE(s.value, 0)::int AS new_students, COALESCE(l.value, 0)::int AS active_learners,
        COALESCE(a.value, 0)::int AS exam_attempts, COALESCE(ans.value, 0)::int AS answers
      FROM days d LEFT JOIN signups s ON s.day = d.day LEFT JOIN learners l ON l.day = d.day
        LEFT JOIN attempts a ON a.day = d.day LEFT JOIN answers ans ON ans.day = d.day
      ORDER BY d.day
    `));

    const learningStages = rowsOf<Record<string, string | number>>(await this.db.execute(sql`
      SELECT sp.learning_status AS status, COUNT(*)::int AS count
      FROM student_profiles sp JOIN users u ON u.id = sp.user_id
      WHERE sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.role = 'STUDENT'
      GROUP BY sp.learning_status ORDER BY COUNT(*) DESC, sp.learning_status
    `)).map((row) => ({ status: String(row.status), count: Number(row.count) }));

    const topSubjects = rowsOf<Record<string, string | number>>(await this.db.execute(sql`
      SELECT COALESCE(s.names ->> 'en', s.slug) AS subject, COUNT(*)::int AS answers
      FROM student_answers sa JOIN questions q ON q.id = sa.question_id JOIN subjects s ON s.id = q.subject_id
      JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
      WHERE sa.answered_at >= (${periodStartTimestamp}::timestamptz) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL
      GROUP BY s.id, s.names, s.slug ORDER BY COUNT(*) DESC, subject LIMIT 5
    `)).map((row) => ({ subject: String(row.subject), answers: Number(row.answers) }));

    const recentActivity = await this.db.select({ id: adminAuditLogs.id, action: adminAuditLogs.action, targetType: adminAuditLogs.targetType, targetId: adminAuditLogs.targetId, createdAt: adminAuditLogs.createdAt })
      .from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(6);
    const summary = {
      students: Number(rawSummary?.students ?? 0), activeLearners: Number(rawSummary?.active_learners ?? 0),
      newStudents: Number(rawSummary?.new_students ?? 0), premium: Number(rawSummary?.premium ?? 0),
      examAttempts: Number(rawSummary?.exam_attempts ?? 0), answers: Number(rawSummary?.answers ?? 0),
      aiRequests: Number(rawSummary?.ai_requests ?? 0), unresolvedContacts: Number(rawSummary?.unresolved_contacts ?? 0),
      newContacts: Number(rawSummary?.new_contacts ?? 0), suspendedStudents: Number(rawSummary?.suspended_students ?? 0),
      publishedQuestions: Number(rawSummary?.published_questions ?? 0), draftQuestions: Number(rawSummary?.draft_questions ?? 0),
    };
    const trend = trendRows.map((row) => ({
      date: String(row.date), label: String(row.label), newStudents: Number(row.new_students),
      activeLearners: Number(row.active_learners), examAttempts: Number(row.exam_attempts), answers: Number(row.answers),
    }));
    return { rangeDays, generatedAt: new Date().toISOString(), summary, trend, learningStages, topSubjects, recentActivity };
  }
}
