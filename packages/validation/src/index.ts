import { z } from "zod";
import { DIFFICULTIES, QUESTION_TYPES } from "@dibora/types";

const ethiopianPhone = /^(?:\+251|0)?[79]\d{8}$/;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().regex(ethiopianPhone, "Enter a valid Ethiopian phone number"),
    password: z.string().min(10, "Use at least 10 characters").max(128)
      .regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    confirmPassword: z.string(),
    educationLevel: z.string().min(1).default("SECONDARY"),
    grade: z.number().int().min(1).max(20),
    school: z.string().trim().min(2).max(160),
    region: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    stream: z.string().trim().min(2).max(60),
    examYear: z.number().int().min(2020).max(2100),
    subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject").max(15),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullish(),
  numericAnswer: z.number().finite().nullish(),
  flagged: z.boolean().default(false),
  timeSpentSeconds: z.number().int().min(0).max(36000).default(0),
});
export const saveAnswersSchema = z.object({ answers: z.array(answerSchema).min(1).max(300) });

export const questionUpsertSchema = z
  .object({
    subjectId: z.string().uuid(), topicId: z.string().uuid(), subtopicId: z.string().uuid().nullish(),
    difficulty: z.enum(DIFFICULTIES), type: z.enum(QUESTION_TYPES),
    text: z.string().trim().min(5), explanation: z.string().trim().min(5),
    options: z.array(z.object({ text: z.string().trim().min(1), isCorrect: z.boolean() })).default([]),
    numericAnswer: z.number().nullish(), numericTolerance: z.number().min(0).default(0),
    tags: z.array(z.string()).default([]), source: z.string().nullish(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "NUMERICAL") {
      if (q.numericAnswer == null) ctx.addIssue({ code: "custom", path: ["numericAnswer"], message: "Numerical answer required" });
      return;
    }
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct !== 1) ctx.addIssue({ code: "custom", path: ["options"], message: "Exactly one option must be correct" });
    if (q.type === "TRUE_FALSE" && q.options.length !== 2) ctx.addIssue({ code: "custom", path: ["options"], message: "True/False needs exactly 2 options" });
    if (q.type === "MULTIPLE_CHOICE" && q.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "At least 2 options required" });
  });

export const diagnosticUpsertSchema = z.object({
  title: z.string().trim().min(3, "Give the diagnostic a title").max(160),
  description: z.string().trim().max(500).optional(),
  instructions: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(300),
  randomize: z.boolean().default(true),
  questionIds: z.array(z.string().uuid()).min(1).max(300),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.questionIds).size !== value.questionIds.length) {
    ctx.addIssue({ code: "custom", path: ["questionIds"], message: "A question can only be added once" });
  }
});

export const aiMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  message: z.string().trim().min(10, "Write at least 10 characters").max(5000),
  website: z.string().max(200).optional(), // honeypot field for basic bot filtering
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().regex(ethiopianPhone, "Enter a valid Ethiopian phone number").optional(),
  school: z.string().trim().min(2).max(160).optional(), region: z.string().trim().min(2).max(80).optional(), city: z.string().trim().min(2).max(80).optional(),
  stream: z.string().trim().min(2).max(60).optional(), examYear: z.number().int().min(2020).max(2100).optional(),
  subjectIds: z.array(z.string().uuid()).min(1).max(15).optional(), displayName: z.string().trim().min(2).max(30).optional(), leaderboardOptIn: z.boolean().optional(),
}).strict(); // .strict(): role, status, email etc. can never be set through this endpoint
export const practiceAnswerSchema = z.object({ questionId: z.string().uuid(), selectedOptionId: z.string().uuid().nullish(), numericAnswer: z.number().finite().nullish(), timeSpentSeconds: z.number().int().min(0).max(3600).default(0) });
export const practiceQuerySchema = z.object({ topicId: z.string().uuid().optional(), difficulty: z.enum(DIFFICULTIES).optional(), mode: z.enum(["random", "wrong"]).default("random"), limit: z.coerce.number().int().min(1).max(30).default(10) });
