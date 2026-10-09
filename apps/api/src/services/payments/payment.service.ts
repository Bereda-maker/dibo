import { PAYMENT_METHODS } from "@dibora/types";
import type { PaymentProvider, VerificationOutcome } from "./provider";
import { ProviderError, isRecoverable } from "./provider";
import { validateReceipt, type ReceiptStorage } from "./receipt";
import { AppError, Errors } from "../../utils/errors";

export type PaymentRow = { id: string; userId: string; subscriptionId: string | null; amountMinor: number; currency: string; status: string; attempt: number; verifyRequestId: string | null };
export type FinalStatus = "VERIFIED" | "FAILED";

/** Persistence port: implemented with Drizzle in production, faked in tests. */
export interface PaymentRepo {
  findByReference(ref: string): Promise<PaymentRow | null>;
  findByVerifyRequestId(requestId: string): Promise<PaymentRow | null>;
  /** True if another payment already VERIFYING/VERIFIED uses this method + transaction reference. */
  referenceInUse(method: string, transactionReference: string, excludePaymentId: string): Promise<boolean>;
  /** Atomically moves PENDING/FAILED -> VERIFYING (attempt+1 after a failure). Null when the payment is not submittable. */
  claimSubmission(paymentId: string, userId: string, f: { method: string; transactionReference: string | null }): Promise<PaymentRow | null>;
  setReceipt(paymentId: string, receiptPath: string): Promise<void>;
  attachRequestId(paymentId: string, requestId: string): Promise<void>;
  /** Back to PENDING after a recoverable provider error so the same idempotency key can be retried. */
  release(paymentId: string): Promise<void>;
  /** One transaction. Records the webhook event (if any) first: a repeated event is a no-op. Only VERIFIED activates access, and only from PENDING/VERIFYING. */
  finalize(paymentId: string, r: { status: FinalStatus; result: Record<string, unknown>; eventId?: string; eventType?: string }): Promise<{ duplicate: boolean; applied: boolean; status: string }>;
  statusFor(userId: string, reference: string): Promise<{ reference: string; status: string; amountMinor: number; currency: string; paymentMethod: string | null; verifiedAt: Date | null } | null>;
}

/** Access is only granted when Verify.et says verified === true AND amount/currency match what the DB charged. */
export function decide(p: Pick<PaymentRow, "amountMinor" | "currency">, o: VerificationOutcome): { status: FinalStatus; result: Record<string, unknown> } {
  const base = { verified: o.verified, amountMinor: o.amountMinor ?? null, currency: o.currency ?? null, reason: o.reason ?? null };
  if (o.verified !== true) return { status: "FAILED", result: { ...base, failure: "NOT_VERIFIED" } };
  if (o.amountMinor === undefined) return { status: "FAILED", result: { ...base, failure: "AMOUNT_UNAVAILABLE" } };
  if (o.amountMinor !== p.amountMinor || (o.currency ?? "ETB") !== p.currency) return { status: "FAILED", result: { ...base, failure: "AMOUNT_MISMATCH", expectedMinor: p.amountMinor } };
  return { status: "VERIFIED", result: base };
}

const log = (level: string, msg: string, extra: Record<string, unknown>) => console.error(JSON.stringify({ level, msg, ...extra })); // never includes keys, headers or receipt bytes

export class PaymentService {
  constructor(private provider: PaymentProvider, private repo: PaymentRepo, private storage: ReceiptStorage) {}

  /** Student submits method + reference + receipt. The browser never talks to Verify.et and never sets the price. */
  async submit(userId: string, reference: string, input: { method: string; transactionReference?: string; bytes: Uint8Array }) {
    if (!(PAYMENT_METHODS as readonly string[]).includes(input.method) || !this.provider.supportedMethods.includes(input.method)) throw Errors.badRequest("Unsupported payment method");
    const txRef = input.transactionReference?.trim() || null;
    if (txRef && !/^[A-Za-z0-9._\-\/ ]{3,64}$/.test(txRef)) throw Errors.badRequest("Transaction reference looks invalid");
    const file = validateReceipt(input.bytes);
    const existing = await this.repo.findByReference(reference);
    if (!existing || existing.userId !== userId) throw Errors.notFound("Payment");
    if (txRef && (await this.repo.referenceInUse(input.method, txRef, existing.id))) throw Errors.conflict("This transaction reference has already been submitted");
    const p = await this.repo.claimSubmission(existing.id, userId, { method: input.method, transactionReference: txRef });
    if (!p) throw Errors.conflict("This payment is already being verified or is complete");
    const idempotencyKey = `dibora-payment-${p.id}-${p.attempt}`;
    try {
      await this.repo.setReceipt(p.id, await this.storage.put(`receipts/${p.id}/${p.attempt}.${file.ext}`, input.bytes));
      const res = await this.provider.submitVerification({ idempotencyKey, method: input.method, transactionReference: txRef ?? undefined, receipt: { bytes: input.bytes, mime: file.mime, filename: `receipt.${file.ext}` } });
      if (res.httpStatus === 202) { await this.repo.attachRequestId(p.id, res.requestId); return { reference, status: "VERIFYING" as const }; }
      if (res.requestId) await this.repo.attachRequestId(p.id, res.requestId);
      const d = decide(p, res.outcome);
      const f = await this.repo.finalize(p.id, d);
      return { reference, status: f.status === "VERIFIED" || f.status === "SUCCESS" ? ("VERIFIED" as const) : (d.status as FinalStatus) };
    } catch (e) {
      if (!(e instanceof ProviderError)) { await this.repo.release(p.id).catch(() => {}); throw e; }
      log("error", "verify.et submission failed", { paymentId: p.id, kind: e.kind, status: e.status });
      if (e.kind === "INVALID_RECEIPT" || e.kind === "NOT_FOUND") { await this.repo.finalize(p.id, { status: "FAILED", result: { failure: e.kind } }); return { reference, status: "FAILED" as const }; }
      if (e.kind === "CONFLICT") return { reference, status: "VERIFYING" as const }; // same key already in flight: the webhook will finish it
      if (isRecoverable(e.kind)) { await this.repo.release(p.id); throw new AppError(503, "VERIFICATION_UNAVAILABLE", "Verification is temporarily unavailable. Please try again in a few minutes."); }
      await this.repo.release(p.id); throw new AppError(502, "VERIFICATION_UNAVAILABLE", "Verification is temporarily unavailable. Please try again.");
    }
  }

  /** Public webhook: HMAC + timestamp first, then idempotent processing. Retries return success without re-granting. */
  async handleWebhook(rawBody: string, headers: Headers) {
    const ev = this.provider.parseWebhook(rawBody, headers);
    if (ev.eventType !== "verification.completed" || !ev.outcome) return { ignored: true as const };
    if (!ev.requestId) throw Errors.badRequest("Missing requestId");
    const p = await this.repo.findByVerifyRequestId(ev.requestId);
    if (!p) throw Errors.notFound("Payment"); // not stored yet (race with the 202 response) or unknown: let the sender retry
    const d = decide(p, ev.outcome);
    const f = await this.repo.finalize(p.id, { ...d, eventId: ev.eventId, eventType: ev.eventType });
    return { status: f.status, duplicate: f.duplicate, applied: f.applied };
  }

  async status(userId: string, reference: string) {
    const s = await this.repo.statusFor(userId, reference); if (!s) throw Errors.notFound("Payment"); return s;
  }
}
