import { and, eq, ne } from "drizzle-orm";
import { payments, subscriptions, subscriptionPlans, studentProfiles, notifications, type Db } from "@dibora/database";
import type { PaymentRepo } from "../services/payments/payment.service";

const DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };

export class DrizzlePaymentRepo implements PaymentRepo {
  constructor(private db: Db) {}
  async findByReference(ref: string) {
    const [p] = await this.db.select().from(payments).where(eq(payments.reference, ref)).limit(1);
    return p ? { id: p.id, userId: p.userId, amountMinor: p.amountMinor, currency: p.currency, status: p.status, subscriptionId: p.subscriptionId } : null;
  }
  /** One transaction; the status guard makes a repeated webhook a no-op. */
  async markSuccessAndActivate(paymentId: string, providerTxId?: string) {
    await this.db.transaction(async (tx) => {
      const won = await tx.update(payments).set({ status: "SUCCESS", providerTransactionId: providerTxId ?? null, updatedAt: new Date() }).where(and(eq(payments.id, paymentId), ne(payments.status, "SUCCESS"))).returning();
      const p = won[0]; if (!p || !p.subscriptionId) return;
      const [row] = await tx.select({ interval: subscriptionPlans.interval }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId)).where(eq(subscriptions.id, p.subscriptionId)).limit(1);
      const now = new Date(); const ends = new Date(now.getTime() + (DAYS[row?.interval ?? "MONTHLY"] ?? 30) * 864e5);
      await tx.update(subscriptions).set({ status: "ACTIVE", startsAt: now, endsAt: ends, provider: p.provider, transactionId: providerTxId ?? p.reference, updatedAt: now }).where(eq(subscriptions.id, p.subscriptionId));
      await tx.update(studentProfiles).set({ subscriptionStatus: "PREMIUM", updatedAt: now }).where(eq(studentProfiles.userId, p.userId));
      await tx.insert(notifications).values({ userId: p.userId, type: "SUBSCRIPTION", title: "Premium is active", body: "Thank you! Your Premium access is now active." });
    });
  }
  async markStatus(paymentId: string, status: "FAILED" | "CANCELLED" | "REFUNDED") {
    await this.db.transaction(async (tx) => {
      const [p] = await tx.update(payments).set({ status, updatedAt: new Date() }).where(eq(payments.id, paymentId)).returning();
      if (status === "REFUNDED" && p?.subscriptionId) { // refunded: revoke access
        await tx.update(subscriptions).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(subscriptions.id, p.subscriptionId));
        await tx.update(studentProfiles).set({ subscriptionStatus: "CANCELLED" }).where(eq(studentProfiles.userId, p.userId));
      }
    });
  }
}
