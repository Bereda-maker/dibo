import { and, eq } from "drizzle-orm";
import { PAYMENT_METHODS } from "@dibora/types";
import { payments, subscriptionPlans, subscriptions, type Db } from "@dibora/database";
import { Errors } from "../../utils/errors";

export type PaymentAccount = { method: string; accountName: string; accountNumber: string };

export class CheckoutService {
  constructor(private db: Db, private providerName: string, private accounts: PaymentAccount[] = []) {}

  async plans() {
    const rows = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder);
    return rows.map((p) => ({ code: p.code, interval: p.interval, names: p.names, priceMinor: p.priceMinor, currency: p.currency, entitlements: p.entitlements }));
  }

  info() { return { methods: PAYMENT_METHODS, accounts: this.accounts }; }

  /** Creates a PENDING payment. The expected amount always comes from the database plan, never from the request. */
  async start(userId: string, planCode: string) {
    const [plan] = await this.db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.code, planCode), eq(subscriptionPlans.isActive, true))).limit(1);
    if (!plan || plan.priceMinor <= 0) throw Errors.notFound("Plan");
    const reference = `dib_${crypto.randomUUID().replaceAll("-", "")}`;
    await this.db.transaction(async (tx) => {
      const [sub] = await tx.insert(subscriptions).values({ userId, planId: plan.id, status: "PENDING", provider: this.providerName }).returning({ id: subscriptions.id });
      await tx.insert(payments).values({ userId, subscriptionId: sub!.id, amountMinor: plan.priceMinor, currency: plan.currency, provider: this.providerName, reference, metadata: { attempt: 1 } });
    });
    return { reference, planCode: plan.code, amountMinor: plan.priceMinor, currency: plan.currency, methods: PAYMENT_METHODS, accounts: this.accounts };
  }
}
