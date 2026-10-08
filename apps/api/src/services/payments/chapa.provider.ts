import type { PaymentProvider, InitializeInput, VerifyResult } from "./provider";
import { timingSafeEqualHex, hmacSha256Hex } from "./crypto";

export class ChapaProvider implements PaymentProvider {
  readonly name = "chapa";
  constructor(private cfg: { secretKey: string; webhookSecret: string; baseUrl?: string }) {}
  private get base() { return this.cfg.baseUrl ?? "https://api.chapa.co/v1"; }

  async initialize(i: InitializeInput) {
    const res = await fetch(`${this.base}/transaction/initialize`, {
      method: "POST", headers: { Authorization: `Bearer ${this.cfg.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: (i.amountMinor / 100).toFixed(2), currency: i.currency, email: i.email, tx_ref: i.reference, return_url: i.returnUrl }),
    });
    const j = (await res.json()) as { data?: { checkout_url?: string } };
    if (!res.ok || !j.data?.checkout_url) throw new Error("Payment initialization failed");
    return { checkoutUrl: j.data.checkout_url };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers) {
    const sig = headers.get("x-chapa-signature") ?? headers.get("chapa-signature") ?? "";
    return timingSafeEqualHex(sig, hmacSha256Hex(this.cfg.webhookSecret, rawBody));
  }

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${this.base}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${this.cfg.secretKey}` } });
    const j = (await res.json()) as { data?: { status?: string; amount?: string; currency?: string; tx_ref?: string } };
    const s = (j.data?.status ?? "").toLowerCase();
    return {
      status: s === "success" ? "SUCCESS" : s === "failed" ? "FAILED" : "PENDING",
      amountMinor: Math.round(parseFloat(j.data?.amount ?? "0") * 100), currency: j.data?.currency ?? "ETB", reference: j.data?.tx_ref ?? reference,
    };
  }
}
