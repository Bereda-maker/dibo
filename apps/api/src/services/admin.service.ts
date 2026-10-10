import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { adminAuditLogs, contactMessages, questions, questionOptions, studentProfiles, subscriptionPlans, users, type Db } from "@dibora/database";
import { questionUpsertSchema } from "@dibora/validation";
import type { z } from "zod";
import { rowsOf } from "../utils/rows";
import { Errors, AppError } from "../utils/errors";

type Actor = { userId: string; ip?: string; requestId?: string };
type QuestionInput = z.infer<typeof questionUpsertSchema>;

export class AdminService {
  constructor(private db: Db) {}
  private audit(a: Actor, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
    return this.db.insert(adminAuditLogs).values({ actorId: a.userId, action, targetType, targetId, metadata, ip: a.ip, requestId: a.requestId });
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
    const [rawSummary] = rowsOf<Record<string, number>>(await this.db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users u WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL)::int AS students,
        (SELECT COUNT(DISTINCT ss.student_id) FROM study_sessions ss
          JOIN student_profiles sp ON sp.id = ss.student_id JOIN users u ON u.id = sp.user_id
          WHERE ss.day >= (${periodStartDate}::date) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.is_active)::int AS active_learners,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL AND u.created_at >= ${periodStart})::int AS new_students,
        (SELECT COUNT(*) FROM student_profiles sp JOIN users u ON u.id = sp.user_id
          WHERE sp.subscription_status = 'PREMIUM' AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.role = 'STUDENT')::int AS premium,
        (SELECT COUNT(*) FROM exam_attempts ea JOIN student_profiles sp ON sp.id = ea.student_id JOIN users u ON u.id = sp.user_id
          WHERE ea.started_at >= ${periodStart} AND sp.deleted_at IS NULL AND u.deleted_at IS NULL)::int AS exam_attempts,
        (SELECT COUNT(*) FROM student_answers sa JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
          WHERE sa.answered_at >= ${periodStart} AND sp.deleted_at IS NULL AND u.deleted_at IS NULL)::int AS answers,
        (SELECT COUNT(*) FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id JOIN users u ON u.id = c.user_id
          WHERE m.role = 'user' AND m.created_at >= ${periodStart} AND u.role = 'STUDENT' AND u.deleted_at IS NULL AND c.deleted_at IS NULL)::int AS ai_requests,
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
        WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL AND u.created_at >= ${periodStart} GROUP BY 1
      ),
      learners AS (
        SELECT ss.day, COUNT(DISTINCT ss.student_id)::int AS value FROM study_sessions ss
        JOIN student_profiles sp ON sp.id = ss.student_id JOIN users u ON u.id = sp.user_id
        WHERE ss.day >= (${periodStartDate}::date) AND sp.deleted_at IS NULL AND u.deleted_at IS NULL AND u.is_active GROUP BY ss.day
      ),
      attempts AS (
        SELECT ea.started_at::date AS day, COUNT(*)::int AS value FROM exam_attempts ea
        JOIN student_profiles sp ON sp.id = ea.student_id JOIN users u ON u.id = sp.user_id
        WHERE ea.started_at >= ${periodStart} AND sp.deleted_at IS NULL AND u.deleted_at IS NULL GROUP BY 1
      ),
      answers AS (
        SELECT sa.answered_at::date AS day, COUNT(*)::int AS value FROM student_answers sa
        JOIN student_profiles sp ON sp.id = sa.student_id JOIN users u ON u.id = sp.user_id
        WHERE sa.answered_at >= ${periodStart} AND sp.deleted_at IS NULL AND u.deleted_at IS NULL GROUP BY 1
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
      WHERE sa.answered_at >= ${periodStart} AND sp.deleted_at IS NULL AND u.deleted_at IS NULL
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
