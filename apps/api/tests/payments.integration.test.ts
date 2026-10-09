import { describe, expect, test, beforeAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { CheckoutService } from "../src/services/payments/checkout.service";
import { PaymentService, decide } from "../src/services/payments/payment.service";
import { DrizzlePaymentRepo } from "../src/db/payment.repo";
import { VerifyEtPaymentProvider } from "../src/services/payments/verify-et.provider";
import { hmacSha256Hex } from "../src/services/payments/crypto";
import { validateReceipt, type ReceiptStorage } from "../src/services/payments/receipt";
import { subscriptionRoutes } from "../src/routes/subscriptions";
import { webhookRoutes } from "../src/routes/payments";
import { errorHandler } from "../src/middleware/error-handler";

const SECRET = "whsec_test";
const raw = drizzle(new PGlite(), { schema: s }); const db = raw as unknown as Db;
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);

// Mocked Verify.et: never touches the network or real credits.
let calls: { url: string; headers: Record<string, string>; form: FormData }[] = []; let respond: () => Response = () => new Response("{}", { status: 500 });
const fetchImpl = (async (url: string, init: RequestInit) => { calls.push({ url, headers: init.headers as Record<string, string>, form: init.body as FormData }); return respond(); }) as unknown as typeof fetch;
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const provider = new VerifyEtPaymentProvider({ apiKey: "KEY", webhookSecret: SECRET, fetchImpl });
const store = new Map<string, Uint8Array>();
const storage: ReceiptStorage = { put: async (k, b) => { store.set(k, b); return k; }, get: async (k) => store.get(k) ?? null };
const checkout = new CheckoutService(db, "verify-et", [{ method: "telebirr", accountName: "Dibora", accountNumber: "0911000000" }]);
const pay = new PaymentService(provider, new DrizzlePaymentRepo(db), storage);
let userId = "", otherId = "";

beforeAll(async () => {
  await migrate(raw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  for (const [i, em] of ["p@q.et", "o@q.et"].entries()) { const [u] = await raw.insert(s.users).values({ email: em, passwordHash: "x" }).returning(); await raw.insert(s.studentProfiles).values({ userId: u!.id, fullName: "P", grade: 12 }); if (i === 0) userId = u!.id; else otherId = u!.id; }
  await raw.insert(s.subscriptionPlans).values([{ code: "free", interval: "FREE", names: { en: "Free" }, priceMinor: 0, entitlements: {} }, { code: "monthly", interval: "MONTHLY", names: { en: "M" }, priceMinor: 15000, entitlements: { mockExams: true } }]);
});
const newPayment = async () => (await checkout.start(userId, "monthly")).reference;
const row = async (ref: string) => (await raw.select().from(s.payments).where(eq(s.payments.reference, ref)))[0]!;
const premium = async (uid = userId) => (await raw.select().from(s.studentProfiles).where(eq(s.studentProfiles.userId, uid)))[0]!.subscriptionStatus;
const submit = (ref: string, over: Partial<{ method: string; transactionReference: string; bytes: Uint8Array }> = {}) => pay.submit(userId, ref, { method: "telebirr", transactionReference: "DE12AB34CD", bytes: jpeg, ...over });
const hook = (body: unknown, o: { id?: string; ts?: number; secret?: string; sigOf?: string } = {}) => {
  const rawBody = JSON.stringify(body); const ts = String(o.ts ?? Math.floor(Date.now() / 1000));
  return { rawBody, headers: new Headers({ "x-webhook-event": "verification.completed", "x-webhook-event-id": o.id ?? crypto.randomUUID(), "x-webhook-timestamp": ts, "x-webhook-delivery-id": "d1", "x-webhook-signature": hmacSha256Hex(o.secret ?? SECRET, o.sigOf ?? `${ts}.${rawBody}`) }) };
};
const done = (requestId: string, over: Record<string, unknown> = {}) => ({ event: "verification.completed", data: { requestId, verified: true, verification: { amount: 150, currency: "ETB" }, ...over } });

describe("payment creation + expected amount", () => {
  test("price comes from the database plan; free plan cannot be purchased", async () => {
    await expect(checkout.start(userId, "free")).rejects.toThrow("not found");
    const c = await checkout.start(userId, "monthly");
    expect(c.amountMinor).toBe(15000); expect(c.methods).toContain("telebirr"); expect(c.accounts.length).toBe(1);
    const p = await row(c.reference); expect(p.amountMinor).toBe(15000); expect(p.status).toBe("PENDING"); expect(p.provider).toBe("verify-et");
  });
});

describe("receipt validation (server side)", () => {
  test("accepts JPEG/PNG/WebP by magic bytes, rejects others and >8MB", () => {
    expect(validateReceipt(jpeg).mime).toBe("image/jpeg"); expect(validateReceipt(png).mime).toBe("image/png"); expect(validateReceipt(webp).mime).toBe("image/webp");
    expect(() => validateReceipt(new TextEncoder().encode("<svg onload=alert(1)>"))).toThrow("JPEG, PNG or WebP");
    expect(() => validateReceipt(new Uint8Array(0))).toThrow("required");
    const big = new Uint8Array(8 * 1024 * 1024 + 1); big.set(jpeg); expect(() => validateReceipt(big)).toThrow("8 MB");
  });
  test("invalid receipt or unsupported method never reaches Verify.et or changes the payment", async () => {
    const ref = await newPayment(); calls = [];
    await expect(submit(ref, { bytes: new Uint8Array([1, 2, 3, 4]) })).rejects.toThrow("JPEG");
    await expect(submit(ref, { method: "paypal" })).rejects.toThrow("Unsupported");
    expect(calls.length).toBe(0); expect((await row(ref)).status).toBe("PENDING");
  });
});

describe("Verify.et submission", () => {
  test("sends multipart image/bank/reference with API key and deterministic idempotency key", async () => {
    const ref = await newPayment(); calls = []; respond = json(202, { requestId: "req_1", statusUrl: "/api/verify/req_1" });
    await submit(ref); const c = calls[0]!; const p = await row(ref);
    expect(c.url).toStartWith("https://verify.et/api/verify?waitMs="); expect(c.headers["x-api-key"]).toBe("KEY");
    expect(c.headers["Idempotency-Key"]).toBe(`dibora-payment-${p.id}-1`);
    expect(c.form.get("bank")).toBe("telebirr"); expect(c.form.get("reference")).toBe("DE12AB34CD"); expect(c.form.get("image")).toBeInstanceOf(Blob);
    expect(p.receiptPath).toBe(`receipts/${p.id}/1.jpg`); expect(store.has(p.receiptPath!)).toBe(true);
  });
  test("202 queued: stores requestId, status VERIFYING, NO access granted", async () => {
    const ref = await newPayment(); respond = json(202, { requestId: "req_q" });
    expect((await submit(ref, { transactionReference: "Q1Q1Q1Q1" })).status).toBe("VERIFYING");
    const p = await row(ref); expect(p.verifyRequestId).toBe("req_q"); expect(p.status).toBe("VERIFYING"); expect(p.verifiedAt).toBeNull(); expect(await premium()).toBe("FREE");
  });
  test("202 without requestId is an integration error: back to PENDING, safe message", async () => {
    const ref = await newPayment(); respond = json(202, {});
    await expect(submit(ref, { transactionReference: "N0N0N0N0" })).rejects.toThrow("temporarily unavailable"); expect((await row(ref)).status).toBe("PENDING");
  });
  test("200 completed + matching amount verifies immediately and activates via existing subscription logic", async () => {
    const ref = await newPayment(); respond = json(200, { requestId: "req_200", verified: true, verification: { amount: 150, currency: "ETB" } });
    expect((await submit(ref, { transactionReference: "A2A2A2A2" })).status).toBe("VERIFIED");
    const p = await row(ref); expect(p.status).toBe("VERIFIED"); expect(p.verifiedAt).not.toBeNull(); expect(p.verifyRequestId).toBe("req_200");
    const [sub] = await raw.select().from(s.subscriptions).where(eq(s.subscriptions.id, p.subscriptionId!)); expect(sub!.status).toBe("ACTIVE"); expect(sub!.endsAt!.getTime()).toBeGreaterThan(Date.now() + 29 * 864e5);
    expect(await premium()).toBe("PREMIUM");
  });
  test("200 with verified:false, or screenshot-only, never grants access", async () => {
    const ref = await newPayment(); respond = json(200, { verified: false, verification: { amount: 150 } });
    expect((await submit(ref, { transactionReference: "B3B3B3B3" })).status).toBe("FAILED"); expect((await row(ref)).status).toBe("FAILED");
    expect(await premium(otherId)).toBe("FREE");
  });
  test("200 verified but amount differs from the DB price -> FAILED (client cannot choose price)", async () => {
    const ref = await newPayment(); respond = json(200, { verified: true, verification: { amount: 1, currency: "ETB" } });
    expect((await submit(ref, { transactionReference: "C4C4C4C4" })).status).toBe("FAILED");
    expect(((await row(ref)).verificationResult as Record<string, unknown>).failure).toBe("AMOUNT_MISMATCH");
  });
  test("400 invalid receipt -> FAILED; student can resubmit a corrected receipt with a NEW idempotency key", async () => {
    const ref = await newPayment(); respond = json(400, { error: "unreadable" });
    expect((await submit(ref, { transactionReference: "D5D5D5D5" })).status).toBe("FAILED");
    calls = []; respond = json(202, { requestId: "req_fix" }); await submit(ref, { transactionReference: "D5D5D5D5", bytes: png });
    const p = await row(ref); expect(calls[0]!.headers["Idempotency-Key"]).toBe(`dibora-payment-${p.id}-2`); expect(p.status).toBe("VERIFYING");
  });
  for (const code of [401, 402, 429, 500, 503]) test(`${code} is recoverable: payment returns to PENDING, retry reuses the same idempotency key, no secrets leak`, async () => {
    const ref = await newPayment(); calls = []; respond = json(code, { error: "internal detail KEY" });
    const err = await submit(ref, { transactionReference: `E${code}E${code}E` }).catch((e) => e); expect(err.status).toBe(503); expect(err.message).not.toContain("KEY"); expect(err.message).not.toContain("internal");
    expect((await row(ref)).status).toBe("PENDING"); respond = json(202, { requestId: `req_r${code}` }); await submit(ref, { transactionReference: `E${code}E${code}E` });
    expect(calls[0]!.headers["Idempotency-Key"]).toBe(calls[1]!.headers["Idempotency-Key"]);
  });
  test("404 -> FAILED; 409 -> stays VERIFYING (awaits webhook); network timeout is recoverable", async () => {
    const a = await newPayment(); respond = json(404, {}); expect((await submit(a, { transactionReference: "F1F1F1F1" })).status).toBe("FAILED");
    const b = await newPayment(); respond = json(409, {}); expect((await submit(b, { transactionReference: "F2F2F2F2" })).status).toBe("VERIFYING");
    const c = await newPayment(); const slow = new PaymentService(new VerifyEtPaymentProvider({ apiKey: "K", webhookSecret: SECRET, fetchImpl: (async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); }) as unknown as typeof fetch }), new DrizzlePaymentRepo(db), storage);
    await expect(slow.submit(userId, c, { method: "cbe", bytes: jpeg })).rejects.toThrow("temporarily unavailable"); expect((await row(c)).status).toBe("PENDING");
  });
  test("a user cannot submit for someone else's payment, resubmit while verifying, or reuse a verified transaction reference", async () => {
    const ref = await newPayment(); respond = json(202, { requestId: "req_own" });
    await expect(pay.submit(otherId, ref, { method: "telebirr", bytes: jpeg })).rejects.toThrow("not found");
    await submit(ref, { transactionReference: "G1G1G1G1" }); await expect(submit(ref, { transactionReference: "G1G1G1G1" })).rejects.toThrow("already being verified");
    const ref2 = await newPayment(); await expect(submit(ref2, { transactionReference: "G1G1G1G1" })).rejects.toThrow("already been submitted");
  });
});

describe("webhook", () => {
  const queued = async (rid: string, txr: string) => { const ref = await newPayment(); respond = json(202, { requestId: rid }); await submit(ref, { transactionReference: txr }); return ref; };
  test("valid signed verification.completed verifies, activates once, and a retry is a no-op", async () => {
    const ref = await queued("req_wh1", "H1H1H1H1"); const before = (await raw.select().from(s.notifications)).length;
    const h = hook(done("req_wh1"), { id: "evt_1" });
    expect(await pay.handleWebhook(h.rawBody, h.headers)).toMatchObject({ status: "VERIFIED", applied: true, duplicate: false });
    expect(await pay.handleWebhook(h.rawBody, h.headers)).toMatchObject({ duplicate: true, applied: false }); // same event id retried
    const h2 = hook(done("req_wh1"), { id: "evt_1b" }); expect(await pay.handleWebhook(h2.rawBody, h2.headers)).toMatchObject({ applied: false }); // new event id, already verified
    expect((await row(ref)).status).toBe("VERIFIED"); expect(await premium()).toBe("PREMIUM"); expect((await raw.select().from(s.notifications)).length).toBe(before + 1);
    expect((await raw.select().from(s.paymentWebhookEvents).where(eq(s.paymentWebhookEvents.eventId, "evt_1"))).length).toBe(1);
  });
  test("failed verification marks FAILED and grants nothing", async () => {
    const ref = await queued("req_wh2", "H2H2H2H2"); const h = hook(done("req_wh2", { verified: false }));
    expect((await pay.handleWebhook(h.rawBody, h.headers)).status).toBe("FAILED"); expect((await row(ref)).status).toBe("FAILED");
  });
  test("amount mismatch in webhook -> FAILED, no entitlement", async () => {
    const ref = await queued("req_wh3", "H3H3H3H3"); const h = hook(done("req_wh3", { verification: { amount: 10, currency: "ETB" } }));
    expect((await pay.handleWebhook(h.rawBody, h.headers)).status).toBe("FAILED");
    const [sub] = await raw.select().from(s.subscriptions).where(eq(s.subscriptions.id, (await row(ref)).subscriptionId!)); expect(sub!.status).toBe("PENDING");
  });
  test("invalid / missing signature, wrong secret, stale timestamp, malformed body are rejected", async () => {
    await queued("req_wh4", "H4H4H4H4"); const body = done("req_wh4");
    const bad = hook(body, { secret: "other" }); await expect(pay.handleWebhook(bad.rawBody, bad.headers)).rejects.toThrow("signature");
    const tampered = hook(body); await expect(pay.handleWebhook(tampered.rawBody.replace("150", "1"), tampered.headers)).rejects.toThrow("signature");
    const none = hook(body); none.headers.delete("x-webhook-signature"); await expect(pay.handleWebhook(none.rawBody, none.headers)).rejects.toThrow("signature");
    const stale = hook(body, { ts: Math.floor(Date.now() / 1000) - 3600 }); await expect(pay.handleWebhook(stale.rawBody, stale.headers)).rejects.toThrow("timestamp");
    expect((await raw.select().from(s.paymentWebhookEvents).where(eq(s.paymentWebhookEvents.eventId, "x"))).length).toBe(0);
    const ok = hook(body); expect((await pay.handleWebhook(ok.rawBody, ok.headers)).status).toBe("VERIFIED");
  });
  test("unknown requestId -> 404 (sender retries); other event types are acknowledged and ignored", async () => {
    const h = hook(done("req_nope")); await expect(pay.handleWebhook(h.rawBody, h.headers)).rejects.toThrow("not found");
    const o = hook({ event: "credits.low", data: {} }); o.headers.set("x-webhook-event", "credits.low"); expect(await pay.handleWebhook(o.rawBody, o.headers)).toEqual({ ignored: true });
  });
  test("HTTP routes: webhook is public (no cookie) and needs a valid signature; submit validates multipart server-side", async () => {
    const ref = await queued("req_http", "H5H5H5H5"); const app = new Hono();
    app.use("/api/subscriptions/*", async (c, n) => { c.set("auth" as never, { userId } as never); await n(); });
    app.route("/api/subscriptions", subscriptionRoutes(checkout, pay)); app.route("/api/webhooks", webhookRoutes(pay)); app.onError(errorHandler);
    const h = hook(done("req_http"));
    expect((await app.request("/api/webhooks/verify-et", { method: "POST", body: h.rawBody, headers: h.headers })).status).toBe(200);
    expect((await app.request("/api/webhooks/verify-et", { method: "POST", body: h.rawBody })).status).toBe(401);
    const fd = new FormData(); fd.set("method", "telebirr"); fd.set("image", new File([new Uint8Array([1, 2, 3, 4, 5])], "x.jpg", { type: "image/jpeg" }));
    const ref2 = await newPayment(); const bad = await app.request(`/api/subscriptions/payments/${ref2}/submit`, { method: "POST", body: fd });
    expect(bad.status).toBe(400); expect(((await bad.json()) as { error: { message: string } }).error.message).toContain("JPEG");
    const st = await app.request(`/api/subscriptions/payments/${ref}`); expect(((await st.json()) as { data: { status: string } }).data.status).toBe("VERIFIED");
  });
});

describe("decide()", () => {
  test("only verified === true with the exact expected amount/currency is VERIFIED", () => {
    const p = { amountMinor: 15000, currency: "ETB" };
    expect(decide(p, { verified: true, amountMinor: 15000, currency: "ETB", raw: {} }).status).toBe("VERIFIED");
    for (const o of [{ verified: false, amountMinor: 15000 }, { verified: true }, { verified: true, amountMinor: 14999 }, { verified: true, amountMinor: 15000, currency: "USD" }]) expect(decide(p, { ...o, raw: {} }).status).toBe("FAILED");
  });
});

describe("migration from Chapa", () => {
  test("no Chapa code, config or env remains in the repository", () => {
    const root = resolve(import.meta.dir, "../../.."); const needle = ["cha", "pa"].join(""); const hits: string[] = [];
    const walk = (d: string) => { for (const n of readdirSync(d)) { if ([".git", "node_modules", ".next", "migrations"].includes(n)) continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|json|md|yml|example|sql)$|\.env/.test(n) && !p.endsWith("payments.integration.test.ts") && readFileSync(p, "utf8").toLowerCase().includes(needle)) hits.push(p.replace(root, "")); } };
    walk(root); expect(hits).toEqual([]);
  });
});
