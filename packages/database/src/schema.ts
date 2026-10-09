import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, uuid, text, integer, boolean, timestamp, numeric, jsonb, date,
  index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import {
  ROLES, LEARNING_STATUSES, SUBSCRIPTION_STATUSES, DIFFICULTIES, QUESTION_TYPES, EXAM_TYPES,
  CONTENT_STATUSES, PLAN_INTERVALS, SUB_STATUSES, PAYMENT_STATUSES,
} from "@dibora/types";

// ---------- enums ----------
export const roleEnum = pgEnum("role", ROLES);
export const learningStatusEnum = pgEnum("learning_status", LEARNING_STATUSES);
export const subscriptionStatusEnum = pgEnum("student_subscription_status", SUBSCRIPTION_STATUSES);
export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES);
export const questionTypeEnum = pgEnum("question_type", QUESTION_TYPES);
export const examTypeEnum = pgEnum("exam_type", EXAM_TYPES);
export const contentStatusEnum = pgEnum("content_status", CONTENT_STATUSES);
export const planIntervalEnum = pgEnum("plan_interval", PLAN_INTERVALS);
export const subStatusEnum = pgEnum("subscription_state", SUB_STATUSES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

// ---------- identity ----------
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STUDENT"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  locale: text("locale").notNull().default("en"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_created_idx").on(t.createdAt)]);

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const verificationTokens = pgTable("verification_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(), // EMAIL_VERIFY | PASSWORD_RESET
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (t) => [uniqueIndex("vtokens_hash_uq").on(t.tokenHash)]);

export const studentProfiles = pgTable("student_profiles", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  school: text("school"), region: text("region"), city: text("city"),
  educationLevel: text("education_level").notNull().default("SECONDARY"),
  grade: integer("grade").notNull(),
  stream: text("stream"),
  examYear: integer("exam_year"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  learningStatus: learningStatusEnum("learning_status").notNull().default("REGISTERED"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("FREE"),
  selectedSubjectIds: jsonb("selected_subject_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [uniqueIndex("student_user_uq").on(t.userId), index("student_grade_idx").on(t.educationLevel, t.grade, t.stream)]);

// ---------- curriculum ----------
export const subjects = pgTable("subjects", {
  id: id(),
  educationLevel: text("education_level").notNull().default("SECONDARY"),
  grade: integer("grade").notNull(),
  stream: text("stream"),
  slug: text("slug").notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(), // {en, am, om}
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [uniqueIndex("subjects_scope_slug_uq").on(t.educationLevel, t.grade, t.stream, t.slug), index("subjects_status_idx").on(t.status)]);

export const topics = pgTable("topics", {
  id: id(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [uniqueIndex("topics_subject_slug_uq").on(t.subjectId, t.slug), index("topics_subject_idx").on(t.subjectId)]);

export const subtopics = pgTable("subtopics", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [uniqueIndex("subtopics_topic_slug_uq").on(t.topicId, t.slug), index("subtopics_topic_idx").on(t.topicId)]);

/** Generic container so new material kinds (not just notes) can be added later. */
export const learningMaterials = pgTable("learning_materials", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  subtopicId: uuid("subtopic_id").references(() => subtopics.id, { onDelete: "set null" }),
  kind: text("kind").notNull().default("NOTE"),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [index("materials_topic_idx").on(t.topicId)]);

export const notes = pgTable("notes", {
  id: id(),
  materialId: uuid("material_id").notNull().references(() => learningMaterials.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("en"),
  title: text("title").notNull(),
  summary: text("summary"),
  /** Structured rich content: explanation, definitions, formulas, examples, keyPoints, commonMistakes, examTips */
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  searchText: text("search_text"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("notes_material_locale_uq").on(t.materialId, t.locale)]);

// ---------- questions ----------
export const questions = pgTable("questions", {
  id: id(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  topicId: uuid("topic_id").notNull().references(() => topics.id),
  subtopicId: uuid("subtopic_id").references(() => subtopics.id),
  difficulty: difficultyEnum("difficulty").notNull(),
  type: questionTypeEnum("type").notNull(),
  text: text("text").notNull(),
  explanation: text("explanation").notNull(),
  numericAnswer: numeric("numeric_answer"),
  numericTolerance: numeric("numeric_tolerance").notNull().default("0"),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  source: text("source"),
  /** type-specific payload for future question types */
  extra: jsonb("extra").$type<Record<string, unknown>>(),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [index("q_subject_idx").on(t.subjectId), index("q_topic_idx").on(t.topicId), index("q_filter_idx").on(t.status, t.difficulty, t.type)]);

export const questionOptions = pgTable("question_options", {
  id: id(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("qopt_question_idx").on(t.questionId)]);

// ---------- exams ----------
export const exams = pgTable("exams", {
  id: id(),
  type: examTypeEnum("type").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  durationMinutes: integer("duration_minutes").notNull(),
  questionCount: integer("question_count").notNull(),
  passingScore: integer("passing_score").notNull().default(50),
  difficulty: difficultyEnum("difficulty"),
  attemptLimit: integer("attempt_limit"),
  randomize: boolean("randomize").notNull().default(false),
  requiresPremium: boolean("requires_premium").notNull().default(false),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [index("exams_subject_idx").on(t.subjectId), index("exams_type_status_idx").on(t.type, t.status)]);

export const examQuestions = pgTable("exam_questions", {
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id),
  sortOrder: integer("sort_order").notNull().default(0),
  marks: integer("marks").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.examId, t.questionId] })]);

export const examAttempts = pgTable("exam_attempts", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  examId: uuid("exam_id").notNull().references(() => exams.id),
  status: text("status").notNull().default("IN_PROGRESS"), // IN_PROGRESS | SUBMITTED | EXPIRED
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  /** Server-authoritative deadline; client timer is display-only. */
  deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  questionOrder: jsonb("question_order").$type<string[]>().notNull(),
  score: integer("score"), maxScore: integer("max_score"),
  percentage: numeric("percentage"),
  result: jsonb("result").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
}, (t) => [index("attempt_student_idx").on(t.studentId, t.createdAt), index("attempt_exam_idx").on(t.examId)]);

export const studentAnswers = pgTable("student_answers", {
  id: id(),
  attemptId: uuid("attempt_id").references(() => examAttempts.id, { onDelete: "cascade" }), // null for practice answers
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id),
  context: text("context").notNull().default("EXAM"), // EXAM | PRACTICE
  selectedOptionId: uuid("selected_option_id").references(() => questionOptions.id),
  numericAnswer: numeric("numeric_answer"),
  isCorrect: boolean("is_correct"),
  flagged: boolean("flagged").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("answer_attempt_question_uq").on(t.attemptId, t.questionId),
  index("answer_student_q_idx").on(t.studentId, t.questionId),
  index("answer_student_time_idx").on(t.studentId, t.answeredAt),
]);

// ---------- engagement ----------
export const bookmarks = pgTable("bookmarks", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // NOTE | QUESTION | TOPIC
  targetId: uuid("target_id").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("bookmark_uq").on(t.studentId, t.targetType, t.targetId)]);

export const studySessions = pgTable("study_sessions", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  activity: text("activity").notNull(), // NOTE | PRACTICE | EXAM | AI
  day: date("day").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("sessions_student_day_idx").on(t.studentId, t.day)]);

export const studentProgress = pgTable("student_progress", {
  studentId: uuid("student_id").primaryKey().references(() => studentProfiles.id, { onDelete: "cascade" }),
  questionsAttempted: integer("questions_attempted").notNull().default(0),
  questionsCorrect: integer("questions_correct").notNull().default(0),
  notesCompleted: integer("notes_completed").notNull().default(0),
  examsCompleted: integer("exams_completed").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDay: date("last_active_day"),
  points: integer("points").notNull().default(0),
  readiness: jsonb("readiness").$type<Record<string, number>>(),
  updatedAt: updatedAt(),
});

export const topicProgress = pgTable("topic_progress", {
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  attempted: integer("attempted").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  recentAttempted: integer("recent_attempted").notNull().default(0),
  recentCorrect: integer("recent_correct").notNull().default(0),
  noteCompleted: boolean("note_completed").notNull().default(false),
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.studentId, t.topicId] })]);

export const recommendations = pgTable("recommendations", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  priority: text("priority").notNull(), // HIGH | MEDIUM | LOW
  action: text("action").notNull(),     // PRACTICE | READ_NOTE | TAKE_EXAM
  reason: text("reason").notNull(),
  params: jsonb("params").$type<Record<string, unknown>>(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("rec_student_idx").on(t.studentId, t.createdAt)]);

export const achievements = pgTable("achievements", {
  id: id(),
  code: text("code").notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull(),
  points: integer("points").notNull().default(0),
}, (t) => [uniqueIndex("achievement_code_uq").on(t.code)]);

export const studentAchievements = pgTable("student_achievements", {
  studentId: uuid("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  achievementId: uuid("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.studentId, t.achievementId] })]);

export const notifications = pgTable("notifications", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  channel: text("channel").notNull().default("IN_APP"), // IN_APP | EMAIL | SMS | PUSH
  title: text("title").notNull(), body: text("body"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("notif_user_idx").on(t.userId, t.createdAt)]);

// ---------- AI ----------
export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  createdAt: createdAt(), updatedAt: updatedAt(), deletedAt: deletedAt(),
}, (t) => [index("aiconv_user_idx").on(t.userId, t.updatedAt)]);

export const aiMessages = pgTable("ai_messages", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  sources: jsonb("sources").$type<string[]>(),
  tokensUsed: integer("tokens_used"),
  createdAt: createdAt(),
}, (t) => [index("aimsg_conv_idx").on(t.conversationId, t.createdAt)]);

// ---------- commerce ----------
export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  code: text("code").notNull(),
  interval: planIntervalEnum("interval").notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  priceMinor: integer("price_minor").notNull().default(0), // in santim; configurable by admin
  currency: text("currency").notNull().default("ETB"),
  /** Feature flags + limits, e.g. {"questionsPerDay":20,"mockExams":false,"aiMessagesPerDay":10} */
  entitlements: jsonb("entitlements").$type<Record<string, number | boolean>>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("plan_code_uq").on(t.code)]);

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subStatusEnum("status").notNull().default("PENDING"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  provider: text("provider"), transactionId: text("transaction_id"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("sub_user_idx").on(t.userId, t.status), index("sub_end_idx").on(t.endsAt)]);

export const payments = pgTable("payments", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("ETB"),
  provider: text("provider").notNull(),
  /** Our own reference sent to the provider; the provider's id lives in providerTransactionId. */
  reference: text("reference").notNull(),
  providerTransactionId: text("provider_transaction_id"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  /** Verify.et manual-payment fields. */
  paymentMethod: text("payment_method"),
  transactionReference: text("transaction_reference"),
  receiptPath: text("receipt_path"), // private storage key, never a public URL
  verifyRequestId: text("verify_request_id"),
  verificationResult: jsonb("verification_result").$type<Record<string, unknown>>(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("payment_ref_uq").on(t.reference), index("payment_user_idx").on(t.userId, t.createdAt), index("payment_status_idx").on(t.status)]);

/** One row per processed Verify.et webhook event; the unique event id makes retries no-ops. */
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: id(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  paymentId: uuid("payment_id").references(() => payments.id),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("payment_webhook_event_uq").on(t.eventId)]);

// ---------- admin ----------
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: id(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"), targetId: text("target_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ip: text("ip"), requestId: text("request_id"),
  createdAt: createdAt(),
}, (t) => [index("audit_actor_idx").on(t.actorId, t.createdAt), index("audit_action_idx").on(t.action)]);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});
