import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { payments, paymentWebhookEvents, subscriptions, subscriptionPlans, studentProfiles, notifications, users, type Db } from "@dibora/database";
import type { ManualReview, PaymentRepo, PaymentRow } from "../services/payments/payment.service";

const DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };
type PaymentMeta = { attempt?: number; manualReviewStatus?: string; manualReviewReason?: string; manualReviewSubmittedAt?: string };
const meta = (v: unknown): PaymentMeta => (v && typeof v === "object" && !Array.isArray(v) ? v as PaymentMeta : {});
const toRow = (p: typeof payments.$inferSelect): PaymentRow => ({ id: p.id, userId: p.userId, subscriptionId: p.subscriptionId, amountMinor: p.amountMinor, currency: p.currency, status: p.status, attempt: Number(meta(p.metadata).attempt ?? 1), verifyRequestId: p.verifyRequestId, manualReviewStatus: meta(p.metadata).manualReviewStatus ?? null });
const reviewWhere = sql`${payments.metadata}->>'manualReviewStatus' = 'PENDING'`;

export class DrizzlePaymentRepo implements PaymentRepo {
  constructor(private db: Db) {}
  async findByReference(ref: string) { const [p] = await this.db.select().from(payments).where(eq(payments.reference, ref)).limit(1); return p ? toRow(p) : null; }
  async findByVerifyRequestId(rid: string) { const [p] = await this.db.select().from(payments).where(eq(payments.verifyRequestId, rid)).limit(1); return p ? toRow(p) : null; }
  async referenceInUse(method: string, ref: string, excludeId: string) {
    const rows = await this.db.select({ id: payments.id }).from(payments).where(and(eq(payments.paymentMethod, method), eq(payments.transactionReference, ref), ne(payments.id, excludeId), inArray(payments.status, ["VERIFYING", "VERIFIED", "SUCCESS"]))).limit(1);
    return rows.length > 0;
  }
  async claimSubmission(id: string, userId: string, f: { method: string; transactionReference: string | null }) {
    const [cur] = await this.db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, userId))).limit(1);
    if (!cur || (cur.status !== "PENDING" && cur.status !== "FAILED") || meta(cur.metadata).manualReviewStatus === "PENDING") return null;
    const attempt = Number(meta(cur.metadata).attempt ?? 1) + (cur.status === "FAILED" ? 1 : 0);
    // Compare-and-set on the status we read: two concurrent submits cannot both win.
    const [won] = await this.db.update(payments).set({ status: "VERIFYING", paymentMethod: f.method, transactionReference: f.transactionReference, verifyRequestId: null, verificationResult: null, metadata: { ...(cur.metadata ?? {}), attempt }, updatedAt: new Date() }).where(and(eq(payments.id, id), eq(payments.status, cur.status))).returning();
    return won ? toRow(won) : null;
  }
  async setReceipt(id: string, path: string) { await this.db.update(payments).set({ receiptPath: path, updatedAt: new Date() }).where(eq(payments.id, id)); }
  async receiptPath(id: string) { const [p] = await this.db.select({ path: payments.receiptPath }).from(payments).where(eq(payments.id, id)).limit(1); return p?.path ?? null; }
  async attachRequestId(id: string, rid: string) { await this.db.update(payments).set({ verifyRequestId: rid, updatedAt: new Date() }).where(eq(payments.id, id)); }
  async release(id: string) { await this.db.update(payments).set({ status: "PENDING", updatedAt: new Date() }).where(and(eq(payments.id, id), eq(payments.status, "VERIFYING"))); }

  /** Single transaction: event dedupe -> guarded status change -> (VERIFIED only) the existing subscription/entitlement activation. */
  async finalize(paymentId: string, r: { status: "VERIFIED" | "FAILED"; result: Record<string, unknown>; eventId?: string; eventType?: string }) {
    return this.db.transaction(async (tx) => {
      if (r.eventId) {
        const ins = await tx.insert(paymentWebhookEvents).values({ eventId: r.eventId, eventType: r.eventType ?? "unknown", paymentId }).onConflictDoNothing().returning({ id: paymentWebhookEvents.id });
        if (!ins.length) { const [cur] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId)); return { duplicate: true, applied: false, status: cur?.status ?? "UNKNOWN" }; }
      }
      const [pay] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (!pay) return { duplicate: false, applied: false, status: "UNKNOWN" };
      let status: "VERIFIED" | "FAILED" = r.status; let result = r.result;
      if (status === "VERIFIED") { // resource relationship: the subscription must exist and belong to the payer
        const [sub] = pay.subscriptionId ? await tx.select().from(subscriptions).where(eq(subscriptions.id, pay.subscriptionId)).limit(1) : [];
        if (!sub || sub.userId !== pay.userId) { status = "FAILED"; result = { ...result, failure: "RESOURCE_MISMATCH" }; }
      }
      const now = new Date();
      const [won] = await tx.update(payments).set({ status, verificationResult: result, verifiedAt: status === "VERIFIED" ? now : null, updatedAt: now }).where(and(eq(payments.id, paymentId), inArray(payments.status, ["PENDING", "VERIFYING"]))).returning();
      if (!won) return { duplicate: false, applied: false, status: pay.status };
      if (status === "VERIFIED" && won.subscriptionId) {
        const [row] = await tx.select({ interval: subscriptionPlans.interval }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).where(eq(subscriptions.id, won.subscriptionId)).limit(1);
        const ends = new Date(now.getTime() + (DAYS[row?.interval ?? "MONTHLY"] ?? 30) * 864e5);
        await tx.update(subscriptions).set({ status: "ACTIVE", startsAt: now, endsAt: ends, provider: won.provider, transactionId: won.verifyRequestId ?? won.reference, updatedAt: now }).where(eq(subscriptions.id, won.subscriptionId));
        await tx.update(studentProfiles).set({ subscriptionStatus: "PREMIUM", updatedAt: now }).where(eq(studentProfiles.userId, won.userId));
        await tx.insert(notifications).values({ userId: won.userId, type: "SUBSCRIPTION", title: "Premium is active", body: "Thank you! Your payment was verified and Premium access is now active." });
      }
      return { duplicate: false, applied: true, status };
    });
  }
  async statusFor(userId: string, reference: string) {
    const [p] = await this.db.select().from(payments).where(and(eq(payments.reference, reference), eq(payments.userId, userId))).limit(1);
    return p ? { reference: p.reference, status: p.status, amountMinor: p.amountMinor, currency: p.currency, paymentMethod: p.paymentMethod, verifiedAt: p.verifiedAt, manualReviewStatus: meta(p.metadata).manualReviewStatus ?? null } : null;
  }
  async markManualReview(id: string, reason: string) {
    const [p] = await this.db.select({ metadata: payments.metadata }).from(payments).where(eq(payments.id, id)).limit(1);
    if (p) await this.db.update(payments).set({ metadata: { ...meta(p.metadata), manualReviewStatus: "PENDING", manualReviewReason: reason, manualReviewSubmittedAt: new Date().toISOString() }, verificationResult: { failure: "MANUAL_REVIEW", providerFailure: reason }, updatedAt: new Date() }).where(eq(payments.id, id));
  }
  private reviewRow(p: { id: string; userId: string; reference: string; amountMinor: number; currency: string; paymentMethod: string | null; transactionReference: string | null; status: string; metadata: unknown; createdAt: Date; fullName: string | null; email: string; phone: string | null }): ManualReview {
    const m = meta(p.metadata); return { id: p.id, userId: p.userId, reference: p.reference, amountMinor: p.amountMinor, currency: p.currency, paymentMethod: p.paymentMethod, transactionReference: p.transactionReference, status: p.status, reviewReason: m.manualReviewReason ?? null, submittedAt: m.manualReviewSubmittedAt ?? p.createdAt.toISOString(), studentName: p.fullName ?? "Student", email: p.email, phone: p.phone };
  }
  async findManualReview(id: string) {
    const [p] = await this.db.select({ id: payments.id, userId: payments.userId, reference: payments.reference, amountMinor: payments.amountMinor, currency: payments.currency, paymentMethod: payments.paymentMethod, transactionReference: payments.transactionReference, status: payments.status, metadata: payments.metadata, createdAt: payments.createdAt, fullName: studentProfiles.fullName, email: users.email, phone: studentProfiles.phone }).from(payments).innerJoin(users, eq(users.id, payments.userId)).leftJoin(studentProfiles, eq(studentProfiles.userId, payments.userId)).where(and(eq(payments.id, id), reviewWhere)).limit(1);
    return p ? this.reviewRow(p) : null;
  }
  async listManualReviews() {
    const rows = await this.db.select({ id: payments.id, userId: payments.userId, reference: payments.reference, amountMinor: payments.amountMinor, currency: payments.currency, paymentMethod: payments.paymentMethod, transactionReference: payments.transactionReference, status: payments.status, metadata: payments.metadata, createdAt: payments.createdAt, fullName: studentProfiles.fullName, email: users.email, phone: studentProfiles.phone }).from(payments).innerJoin(users, eq(users.id, payments.userId)).leftJoin(studentProfiles, eq(studentProfiles.userId, payments.userId)).where(reviewWhere).orderBy(asc(payments.createdAt));
    return rows.map((p) => this.reviewRow(p));
  }
  async resolveManualReview(id: string, status: "APPROVED" | "REJECTED") {
    const [p] = await this.db.select({ metadata: payments.metadata }).from(payments).where(eq(payments.id, id)).limit(1);
    if (p) await this.db.update(payments).set({ metadata: { ...meta(p.metadata), manualReviewStatus: status }, updatedAt: new Date() }).where(eq(payments.id, id));
  }
}
