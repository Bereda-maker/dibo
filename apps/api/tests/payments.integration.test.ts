import { describe, expect, test, beforeAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { resolve } from "node:path";
import { CheckoutService } from "../src/services/payments/checkout.service";
import { PaymentService } from "../src/services/payments/payment.service";
import { DrizzlePaymentRepo } from "../src/db/payment.repo";
import { hmacSha256Hex } from "../src/services/payments/crypto";
import type { PaymentProvider } from "../src/services/payments/provider";

const raw = drizzle(new PGlite(), { schema: s }); const db = raw as unknown as Db;
let userId = "", amount = 0; let remote: { status: "SUCCESS" | "FAILED"; amountMinor: number } = { status: "SUCCESS", amountMinor: 0 };
const provider: PaymentProvider = { name: "fake", initialize: async (i) => ({ checkoutUrl: `https://pay.test/${i.reference}` }),
  verifyWebhookSignature: (raw, h) => h.get("sig") === hmacSha256Hex("sec", raw),
  verifyTransaction: async (ref) => ({ status: remote.status, amountMinor: remote.amountMinor, currency: "ETB", reference: ref }) };
const checkout = new CheckoutService(db, { fake: provider }, "https://app.test/payment/return");
const pay = new PaymentService({ fake: provider }, new DrizzlePaymentRepo(db));

beforeAll(async () => {
  await migrate(raw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  const [u] = await raw.insert(s.users).values({ email: "p@q.et", passwordHash: "x" }).returning(); userId = u!.id;
  await raw.insert(s.studentProfiles).values({ userId, fullName: "P", grade: 12 });
  await raw.insert(s.subscriptionPlans).values([{ code: "free", interval: "FREE", names: { en: "Free" }, priceMinor: 0, entitlements: {} }, { code: "monthly", interval: "MONTHLY", names: { en: "M" }, priceMinor: 15000, entitlements: { mockExams: true } }]);
});
const hook = (ref: string) => { const body = JSON.stringify({ tx_ref: ref }); return { body, headers: new Headers({ sig: hmacSha256Hex("sec", body) }) }; };

describe("checkout + payment activation on PostgreSQL", () => {
  test("price comes from the plan; free plan cannot be checked out", async () => {
    await expect(checkout.start(userId, "free", "fake")).rejects.toThrow("not found");
    const c = await checkout.start(userId, "monthly", "fake"); amount = 15000;
    const [p] = await raw.select().from(s.payments).where(eq(s.payments.reference, c.reference)); expect(p!.amountMinor).toBe(15000); expect(p!.status).toBe("PENDING");
  });
  test("amount mismatch from provider is rejected and nothing activates", async () => {
    const [p] = await raw.select().from(s.payments); remote = { status: "SUCCESS", amountMinor: 100 };
    const h = hook(p!.reference); await expect(pay.handleWebhook("fake", h.body, h.headers, p!.reference)).rejects.toThrow("does not match");
    const [prof] = await raw.select().from(s.studentProfiles); expect(prof!.subscriptionStatus).toBe("FREE");
  });
  test("verified success activates subscription, sets PREMIUM, and is idempotent", async () => {
    const [p] = await raw.select().from(s.payments); remote = { status: "SUCCESS", amountMinor: amount };
    const h = hook(p!.reference); expect((await pay.handleWebhook("fake", h.body, h.headers, p!.reference)).status).toBe("SUCCESS");
    expect((await pay.handleWebhook("fake", h.body, h.headers, p!.reference)).alreadyProcessed).toBe(true);
    const [sub] = await raw.select().from(s.subscriptions); expect(sub!.status).toBe("ACTIVE"); expect(sub!.endsAt!.getTime()).toBeGreaterThan(Date.now() + 29 * 864e5);
    const [prof] = await raw.select().from(s.studentProfiles); expect(prof!.subscriptionStatus).toBe("PREMIUM");
    expect((await raw.select().from(s.notifications)).length).toBe(1); // second webhook must not notify twice
  });
  test("forged webhook signature is rejected", async () => {
    const [p] = await raw.select().from(s.payments);
    await expect(pay.handleWebhook("fake", "{}", new Headers({ sig: "nope" }), p!.reference)).rejects.toThrow("signature");
  });
});
