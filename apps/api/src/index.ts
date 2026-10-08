import { createDb } from "@dibora/database";
import { createApp } from "./app";
import { AuthService } from "./services/auth.service";
import { PaymentService } from "./services/payments/payment.service";
import { AttemptService } from "./services/attempt.service";
import { DrizzleAttemptRepo, studentContext } from "./db/attempt.repo";
import { CheckoutService } from "./services/payments/checkout.service";
import { DrizzlePaymentRepo } from "./db/payment.repo";
import { ChapaProvider } from "./services/payments/chapa.provider";

import { loadConfig } from "./config";
const cfg = loadConfig();
const env = (k: string) => (cfg as Record<string, unknown>)[k] as string;
const db = createDb(env("DATABASE_URL"));
const chapa = new ChapaProvider({ secretKey: env("PAYMENT_PROVIDER_KEY"), webhookSecret: env("PAYMENT_WEBHOOK_SECRET") });

const repo = new DrizzlePaymentRepo(db);
const payments = new PaymentService({ chapa }, repo);
const checkout = new CheckoutService(db, { chapa }, `${env("WEB_ORIGIN")}/payment/return`);

const app = createApp({
  auth: new AuthService(db), payments, checkout, db, defaultProvider: "chapa",
  attempts: new AttemptService(new DrizzleAttemptRepo(db)), resolveStudent: (uid) => studentContext(db, uid),
  webOrigin: env("WEB_ORIGIN"), isProd: cfg.NODE_ENV === "production",
});
export default { port: cfg.PORT, fetch: app.fetch };
