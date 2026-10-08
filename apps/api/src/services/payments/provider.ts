export type InitializeInput = { reference: string; amountMinor: number; currency: string; email: string; returnUrl: string; metadata?: Record<string, unknown> };
export type InitializeResult = { checkoutUrl: string; providerTransactionId?: string };
export type VerifyResult = { status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED" | "REFUNDED"; amountMinor: number; currency: string; reference: string; providerTransactionId?: string };

export interface PaymentProvider {
  readonly name: string;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Authenticate a webhook using the raw request body and headers. */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  /** Ask the provider directly for the true status; never trust the webhook/client payload alone. */
  verifyTransaction(reference: string): Promise<VerifyResult>;
}
