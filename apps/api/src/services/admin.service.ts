import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { adminAuditLogs, contactMessages, examQuestions, exams, questions, questionOptions, studentProfiles, subjects, subscriptionPlans, topics, users, type Db } from "@dibora/database";
import { diagnosticUpsertSchema, questionUpsertSchema } from "@dibora/validation";
import { MIN_RECOMMENDATION_SAMPLE } from "@dibora/core/recommendation";
import type { z } from "zod";
import { rowsOf } from "../utils/rows";
import { Errors, AppError } from "../utils/errors";

type Actor = { userId: string; ip?: string; requestId?: string };
type QuestionInput = z.infer<typeof questionUpsertSchema>;
type DiagnosticInput = z.infer<typeof diagnosticUpsertSchema>;

export class AdminService {
  constructor(private db: Db) {}
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
  listContactMessages(limit = 50) {
    return this.db.select({ id: contactMessages.id, name: contactMessages.name, email: contactMessages.email, message: contactMessages.message, status: contactMessages.status, createdAt: contactMessages.createdAt })
      .from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(limit);
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
