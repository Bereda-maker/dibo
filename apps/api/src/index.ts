import { createDb } from "@dibora/database";
import { createApp } from "./app";
import { AuthService } from "./services/auth.service";
import { PaymentService } from "./services/payments/payment.service";
import { AttemptService } from "./services/attempt.service";
import { DrizzleAttemptRepo, studentContext } from "./db/attempt.repo";
import { CheckoutService } from "./services/payments/checkout.service";
import { DrizzlePaymentRepo } from "./db/payment.repo";
import { VerifyEtPaymentProvider } from "./services/payments/verify-et.provider";
import { LocalReceiptStorage } from "./services/payments/receipt";

import { StudentService } from "./services/student.service";
import { PracticeService } from "./services/practice.service";
import { ProgressService } from "./services/progress.service";
import { AiChatService, DbRetriever } from "./services/ai-chat.service";
import { LearningService } from "./services/learning.service";
import { AdminService } from "./services/admin.service";
import { AIService } from "./services/ai/ai.service";
import { OpenAICompatibleProvider } from "./services/ai/provider";
import { SocialAuthService } from "./services/social-auth.service";
import { GoogleIdTokenVerifier } from "./services/social-verifiers";
import { loadConfig } from "./config";
import { AppError } from "./utils/errors";
const cfg = loadConfig();
const env = (k: string) => (cfg as Record<string, unknown>)[k] as string;
const db = createDb(env("DATABASE_URL"));
const verifyEt = new VerifyEtPaymentProvider({ apiKey: cfg.VERIFY_ET_API_KEY, webhookSecret: cfg.VERIFY_ET_WEBHOOK_SECRET, baseUrl: cfg.VERIFY_ET_BASE_URL });

const repo = new DrizzlePaymentRepo(db);
const payments = new PaymentService(verifyEt, repo, new LocalReceiptStorage(cfg.RECEIPT_STORAGE_DIR));
const checkout = new CheckoutService(db, verifyEt.name, cfg.PAYMENT_ACCOUNTS);

const auth = new AuthService(db);
const social = new SocialAuthService(db, auth, {
  google: cfg.GOOGLE_CLIENT_ID ? new GoogleIdTokenVerifier({ clientId: cfg.GOOGLE_CLIENT_ID }) : undefined,
  telegram: cfg.TELEGRAM_BOT_TOKEN && cfg.TELEGRAM_BOT_USERNAME ? { botToken: cfg.TELEGRAM_BOT_TOKEN, botUsername: cfg.TELEGRAM_BOT_USERNAME } : undefined,
});

const progress = new ProgressService(db);
const aiProvider = cfg.AI_PROVIDER_API_KEY ? new OpenAICompatibleProvider({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_PROVIDER_API_KEY, model: cfg.AI_MODEL }) : { complete: async () => { throw new AppError(503, "AI_NOT_CONFIGURED", "The Study Assistant is not configured yet. Please try again later."); } };
const chat = new AiChatService(db, new AIService(aiProvider, new DbRetriever(db), [cfg.AI_PROVIDER_API_KEY ?? "", cfg.VERIFY_ET_API_KEY, cfg.VERIFY_ET_WEBHOOK_SECRET, cfg.TELEGRAM_BOT_TOKEN ?? ""]), progress);

const app = createApp({
  students: new StudentService(db), practice: new PracticeService(db, progress), progress, chat, admin: new AdminService(db), learning: new LearningService(db, progress),
  auth, social, cookieSameSite: cfg.COOKIE_SAMESITE, payments, checkout, db,
  attempts: new AttemptService(new DrizzleAttemptRepo(db)), resolveStudent: (uid) => studentContext(db, uid),
  webOrigin: env("WEB_ORIGIN"), isProd: cfg.NODE_ENV === "production",
});
export default { port: cfg.PORT, fetch: app.fetch };
