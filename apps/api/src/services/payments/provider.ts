/** Provider-neutral manual-payment verification port. Implemented by VerifyEtPaymentProvider. */
export type SubmitInput = {
  /** Deterministic per payment attempt, so a retried submission never creates a second verification. */
  idempotencyKey: string;
  method: string;
  transactionReference?: string;
  receipt: { bytes: Uint8Array; mime: string; filename: string };
};
/** Final result of a verification. `verified` must be strictly true to ever grant access. */
export type VerificationOutcome = { verified: boolean; amountMinor?: number; currency?: string; reason?: string; raw: Record<string, unknown> };
export type SubmitResult =
  | { httpStatus: 200; requestId?: string; outcome: VerificationOutcome }
  | { httpStatus: 202; requestId: string };
export type WebhookEvent = { eventId: string; eventType: string; requestId?: string; outcome?: VerificationOutcome };

export type ProviderErrorKind = "INVALID_RECEIPT" | "AUTH" | "CREDITS" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM" | "TIMEOUT" | "BAD_RESPONSE";
/** Never carries secrets; `kind` drives retry/fail decisions and the safe message shown to students. */
export class ProviderError extends Error { constructor(public kind: ProviderErrorKind, public status?: number) { super(`Verification provider error: ${kind}${status ? ` (${status})` : ""}`); } }
/** Errors after which the same submission may safely be retried with the same idempotency key. */
export const isRecoverable = (k: ProviderErrorKind) => ["AUTH", "CREDITS", "RATE_LIMITED", "UPSTREAM", "TIMEOUT", "BAD_RESPONSE"].includes(k);

export interface PaymentProvider {
  readonly name: string;
  readonly supportedMethods: readonly string[];
  submitVerification(input: SubmitInput): Promise<SubmitResult>;
  /** Authenticates a webhook (HMAC + timestamp) and parses it. Throws AppError(401/400) when invalid. */
  parseWebhook(rawBody: string, headers: Headers, now?: Date): WebhookEvent;
}
