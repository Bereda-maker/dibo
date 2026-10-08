import { createDb, subjects, topics, questions, questionOptions, subscriptionPlans, achievements, users } from "./index";
import { eq } from "drizzle-orm";
const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is required");
const db = createDb(url);
const n = (en: string, am?: string) => ({ en, ...(am ? { am } : {}) });

// Plans: prices are configuration. Amounts in santim. Edit in the admin Settings page or here before launch.
await db.insert(subscriptionPlans).values([
  { code: "free", interval: "FREE", names: n("Free"), priceMinor: 0, sortOrder: 0, entitlements: { questionsPerDay: 20, mockExams: false, aiMessagesPerDay: 5 } },
  { code: "monthly", interval: "MONTHLY", names: n("Premium Monthly"), priceMinor: 15000, sortOrder: 1, entitlements: { questionsPerDay: 100000, mockExams: true, advancedAnalytics: true, personalizedRecommendations: true, aiMessagesPerDay: 200, fullQuestionBank: true } },
  { code: "quarterly", interval: "QUARTERLY", names: n("Premium Quarterly"), priceMinor: 39000, sortOrder: 2, entitlements: { questionsPerDay: 100000, mockExams: true, advancedAnalytics: true, personalizedRecommendations: true, aiMessagesPerDay: 200, fullQuestionBank: true } },
  { code: "annual", interval: "ANNUAL", names: n("Premium Annual"), priceMinor: 120000, sortOrder: 3, entitlements: { questionsPerDay: 100000, mockExams: true, advancedAnalytics: true, personalizedRecommendations: true, aiMessagesPerDay: 200, fullQuestionBank: true } },
]).onConflictDoNothing();

await db.insert(achievements).values([["FIRST_EXAM", "First Exam", 20], ["Q100", "First 100 Questions", 50], ["Q500", "500 Questions", 150], ["S7", "7-Day Streak", 50], ["S30", "30-Day Streak", 200], ["E90", "90% Exam Score", 100], ["MOCK", "First Mock Exam", 50], ["MASTERY", "Topic Mastery", 100]]
  .map(([code, name, points]) => ({ code: code as string, names: n(name as string), criteria: { code }, points: points as number }))).onConflictDoNothing();

// Optional first super-admin: SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (never committed; remove after first login).
if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
  const email = process.env.SEED_ADMIN_EMAIL.toLowerCase();
  if (!(await db.select().from(users).where(eq(users.email, email))).length) await db.insert(users).values({ email, passwordHash: await Bun.password.hash(process.env.SEED_ADMIN_PASSWORD, { algorithm: "argon2id" }), role: "SUPER_ADMIN", emailVerifiedAt: new Date() });
}

// Sample curriculum so a fresh install is usable. Replace with real, reviewed Ethiopian Grade 12 content via the admin panel.
if (process.env.SEED_SAMPLE_CONTENT === "true") {
  const [math] = await db.insert(subjects).values({ grade: 12, stream: "Natural Science", slug: "mathematics", names: n("Mathematics", "ሒሳብ"), status: "PUBLISHED" }).onConflictDoNothing().returning();
  if (math) {
    const [alg] = await db.insert(topics).values({ subjectId: math.id, slug: "algebra", names: n("Algebra", "አልጀብራ"), status: "PUBLISHED" }).returning();
    const [q] = await db.insert(questions).values({ subjectId: math.id, topicId: alg!.id, difficulty: "EASY", type: "MULTIPLE_CHOICE", text: "Solve for x: 2x + 6 = 14", explanation: "Subtract 6 to get 2x = 8, so x = 4.", status: "PUBLISHED", source: "sample" }).returning();
    await db.insert(questionOptions).values(["3", "4", "5", "10"].map((t, i) => ({ questionId: q!.id, text: t, isCorrect: t === "4", sortOrder: i })));
  }
}
console.log("Seed complete"); process.exit(0);
