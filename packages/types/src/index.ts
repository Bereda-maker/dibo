export const ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"] as const;
export const LEARNING_STATUSES = ["REGISTERED", "PROFILE_INCOMPLETE", "DIAGNOSTIC_PENDING", "ACTIVE_LEARNER", "EXAM_PREPARATION", "READY_FOR_MOCK", "COMPLETED"] as const;
export const SUBSCRIPTION_STATUSES = ["FREE", "PREMIUM", "EXPIRED", "CANCELLED"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERICAL"] as const;
export const EXAM_TYPES = ["DIAGNOSTIC", "PRACTICE", "TOPIC", "SUBJECT", "MOCK"] as const;
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const PLAN_INTERVALS = ["FREE", "MONTHLY", "QUARTERLY", "ANNUAL"] as const;
export const SUB_STATUSES = ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"] as const;
export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"] as const;
export const LOCALES = ["en", "am", "om"] as const;

export type Role = (typeof ROLES)[number];
export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type ExamType = (typeof EXAM_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type Locale = (typeof LOCALES)[number];

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: { code: string; message: string; details?: unknown; requestId?: string } };
