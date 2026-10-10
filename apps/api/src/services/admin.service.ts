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
  async overview() {
    const [r] = rowsOf<Record<string, number>>(await this.db.execute(sql`select (select count(*) from users u join student_profiles s on s.user_id=u.id where u.deleted_at is null)::int as students, (select count(*) from student_profiles where subscription_status='PREMIUM')::int as premium, (select count(*) from exam_attempts)::int as attempts, (select count(*) from ai_messages where role='user')::int as ai_messages`));
    return r;
  }
}
