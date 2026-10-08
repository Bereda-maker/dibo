import { createDb } from "@dibora/database";
import { createApp } from "./app";
import { AuthService } from "./services/auth.service";
import { PaymentService } from "./services/payments/payment.service";
import { AttemptService } from "./services/attempt.service";
import { DrizzleAttemptRepo, studentContext } from "./db/attempt.repo";
import { CheckoutService } from "./services/payments/checkout.service";
import { DrizzlePaymentRepo } from "./db/payment.repo";
import { ChapaProvider } from "./services/payments/chapa.provider";

import { StudentService } from "./services/student.service";
import { PracticeService } from "./services/practice.service";
import { ProgressService } from "./services/progress.service";
import { AiChatService, DbRetriever } from "./services/ai-chat.service";
import { LearningService } from "./services/learning.service";
import { AdminService } from "./services/admin.service";
import { AIService } from "./services/ai/ai.service";
import { OpenAICompatibleProvider } from "./services/ai/provider";
import { loadConfig } from "./config";
const cfg = loadConfig();
const env = (k: string) => (cfg as Record<string, unknown>)[k] as string;
const db = createDb(env("DATABASE_URL"));
const chapa = new ChapaProvider({ secretKey: env("PAYMENT_PROVIDER_KEY"), webhookSecret: env("PAYMENT_WEBHOOK_SECRET") });

const repo = new DrizzlePaymentRepo(db);
const payments = new PaymentService({ chapa }, repo);
const checkout = new CheckoutService(db, { chapa }, `${env("WEB_ORIGIN")}/payment/return`);

const progress = new ProgressService(db);
const aiProvider = cfg.AI_BASE_URL && cfg.AI_PROVIDER_API_KEY && cfg.AI_MODEL ? new OpenAICompatibleProvider({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_PROVIDER_API_KEY, model: cfg.AI_MODEL }) : { complete: async () => { throw new Error("AI provider is not configured"); } };
const chat = new AiChatService(db, new AIService(aiProvider, new DbRetriever(db), [cfg.AI_PROVIDER_API_KEY ?? "", cfg.PAYMENT_PROVIDER_KEY, cfg.PAYMENT_WEBHOOK_SECRET]), progress);

const app = createApp({
  students: new StudentService(db), practice: new PracticeService(db, progress), progress, chat, admin: new AdminService(db), learning: new LearningService(db, progress),
  auth: new AuthService(db), payments, checkout, db, defaultProvider: "chapa",
  attempts: new AttemptService(new DrizzleAttemptRepo(db)), resolveStudent: (uid) => studentContext(db, uid),
  webOrigin: env("WEB_ORIGIN"), isProd: cfg.NODE_ENV === "production",
});
export default { port: cfg.PORT, fetch: app.fetch };
