import { and, eq } from "drizzle-orm";
import { payments, subscriptionPlans, subscriptions, users, type Db } from "@dibora/database";
import type { PaymentProvider } from "./provider";
import { AppError, Errors } from "../../utils/errors";

export class CheckoutService {
  constructor(private db: Db, private providers: Record<string, PaymentProvider>, private returnUrl: string) {}

  async plans() {
    const rows = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder);
    return rows.map((p) => ({ code: p.code, interval: p.interval, names: p.names, priceMinor: p.priceMinor, currency: p.currency }));
  }

  /** The amount always comes from the database plan, never from the request. */
  async start(userId: string, planCode: string, providerName: string) {
    const provider = this.providers[providerName]; if (!provider) throw new AppError(400, "UNKNOWN_PROVIDER", "Unsupported payment provider");
    const [plan] = await this.db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.code, planCode), eq(subscriptionPlans.isActive, true))).limit(1);
    if (!plan || plan.priceMinor <= 0) throw Errors.notFound("Plan");
    const [u] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1); if (!u) throw Errors.unauthorized();
    const reference = `dib_${crypto.randomUUID().replaceAll("-", "")}`;
    const paymentId = await this.db.transaction(async (tx) => {
      const [sub] = await tx.insert(subscriptions).values({ userId, planId: plan.id, status: "PENDING", provider: providerName }).returning({ id: subscriptions.id });
      const [pay] = await tx.insert(payments).values({ userId, subscriptionId: sub!.id, amountMinor: plan.priceMinor, currency: plan.currency, provider: providerName, reference }).returning({ id: payments.id });
      return pay!.id;
    });
    try {
      const init = await provider.initialize({ reference, amountMinor: plan.priceMinor, currency: plan.currency, email: u.email, returnUrl: `${this.returnUrl}?ref=${reference}` });
      return { reference, checkoutUrl: init.checkoutUrl };
    } catch {
      await this.db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, paymentId));
      throw new AppError(502, "PAYMENT_UNAVAILABLE", "Payment provider is unavailable. Please try again.");
    }
  }
}
