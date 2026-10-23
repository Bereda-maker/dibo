import { and, eq } from "drizzle-orm";
import { PAYMENT_METHODS } from "@dibora/types";
import { payments, studentProfiles, subscriptionPlans, subscriptions, users, type Db } from "@dibora/database";
import { Errors } from "../../utils/errors";

export type PaymentAccount = { method: string; accountName: string; accountNumber: string };
const WELCOME_OFFER_MS = 6 * 60 * 60 * 1000;
const WELCOME_DISCOUNT_PERCENT = 50;

export class CheckoutService {
  constructor(private db: Db, private providerName: string, private accounts: PaymentAccount[] = []) {}

  async plans() {
    const rows = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder);
    return rows.map((p) => ({ code: p.code, interval: p.interval, names: p.names, priceMinor: p.priceMinor, currency: p.currency, entitlements: p.entitlements }));
  }

  async welcomeOffer(userId: string, now = new Date()) {
    const [user] = await this.db.select({ createdAt: users.createdAt, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    const [profile] = await this.db.select({ subscriptionStatus: studentProfiles.subscriptionStatus }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
    const expiresAt = user ? new Date(user.createdAt.getTime() + WELCOME_OFFER_MS) : null;
    const eligible = user?.role === "STUDENT" && profile?.subscriptionStatus === "FREE" && !!expiresAt && now.getTime() >= user.createdAt.getTime() && now.getTime() < expiresAt.getTime();
    return { eligible, discountPercent: eligible ? WELCOME_DISCOUNT_PERCENT : 0, expiresAt: eligible ? expiresAt!.toISOString() : null };
  }

  info() { return { methods: PAYMENT_METHODS, accounts: this.accounts }; }

  /** Creates a PENDING payment. The plan price and signup discount are calculated server-side, never accepted from the request. */
  async start(userId: string, planCode: string) {
    const [plan] = await this.db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.code, planCode), eq(subscriptionPlans.isActive, true))).limit(1);
    if (!plan || plan.priceMinor <= 0) throw Errors.notFound("Plan");
    const offer = await this.welcomeOffer(userId);
    const discountMinor = offer.eligible ? Math.floor(plan.priceMinor * WELCOME_DISCOUNT_PERCENT / 100) : 0;
    const amountMinor = plan.priceMinor - discountMinor;
    const reference = `dib_${crypto.randomUUID().replaceAll("-", "")}`;
    await this.db.transaction(async (tx) => {
      const [sub] = await tx.insert(subscriptions).values({ userId, planId: plan.id, status: "PENDING", provider: this.providerName }).returning({ id: subscriptions.id });
      await tx.insert(payments).values({ userId, subscriptionId: sub!.id, amountMinor, currency: plan.currency, provider: this.providerName, reference, metadata: { attempt: 1, ...(offer.eligible ? { welcomeDiscountPercent: WELCOME_DISCOUNT_PERCENT, originalAmountMinor: plan.priceMinor, discountMinor } : {}) } });
    });
    return { reference, planCode: plan.code, amountMinor, originalAmountMinor: plan.priceMinor, discountMinor, discountPercent: offer.eligible ? WELCOME_DISCOUNT_PERCENT : 0, currency: plan.currency, methods: PAYMENT_METHODS, accounts: this.accounts };
  }
}
