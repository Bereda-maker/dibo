import type { PaymentProvider } from "./provider";
import { AppError } from "../../utils/errors";

/** Persistence port: implemented with Drizzle in production, faked in tests. */
export interface PaymentRepo {
  findByReference(ref: string): Promise<{ id: string; userId: string; amountMinor: number; currency: string; status: string; subscriptionId: string | null } | null>;
  /** Must run in one DB transaction and be idempotent for an already-successful payment. */
  markSuccessAndActivate(paymentId: string, providerTxId?: string): Promise<void>;
  markStatus(paymentId: string, status: "FAILED" | "CANCELLED" | "REFUNDED"): Promise<void>;
}

export class PaymentService {
  constructor(private providers: Record<string, PaymentProvider>, private repo: PaymentRepo) {}
  private get(name: string) { const p = this.providers[name]; if (!p) throw new AppError(400, "UNKNOWN_PROVIDER", "Unsupported payment provider"); return p; }

  async handleWebhook(providerName: string, rawBody: string, headers: Headers, reference: string) {
    const provider = this.get(providerName);
    if (!provider.verifyWebhookSignature(rawBody, headers)) throw new AppError(401, "INVALID_SIGNATURE", "Invalid webhook signature");
    return this.reconcile(providerName, reference);
  }

  /** Also used by the client return page: it triggers a server-side check, never accepts client-reported status. */
  async reconcile(providerName: string, reference: string) {
    const payment = await this.repo.findByReference(reference);
    if (!payment) throw new AppError(404, "NOT_FOUND", "Payment not found");
    if (payment.status === "SUCCESS") return { status: "SUCCESS" as const, alreadyProcessed: true };
    const v = await this.get(providerName).verifyTransaction(reference);
    if (v.status === "SUCCESS") {
      if (v.amountMinor !== payment.amountMinor || v.currency !== payment.currency || v.reference !== reference)
        throw new AppError(409, "AMOUNT_MISMATCH", "Verified payment does not match the order");
      await this.repo.markSuccessAndActivate(payment.id, v.providerTransactionId);
      return { status: "SUCCESS" as const, alreadyProcessed: false };
    }
    if (v.status === "FAILED" || v.status === "CANCELLED" || v.status === "REFUNDED") await this.repo.markStatus(payment.id, v.status);
    return { status: v.status, alreadyProcessed: false };
  }
}
