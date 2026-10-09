import { PAYMENT_METHODS } from "@dibora/types";
import { AppError } from "../../utils/errors";
import { hmacSha256Hex, timingSafeEqualHex } from "./crypto";
import { ProviderError, type PaymentProvider, type SubmitInput, type SubmitResult, type VerificationOutcome, type WebhookEvent } from "./provider";

type Cfg = { apiKey: string; webhookSecret: string; baseUrl?: string; waitMs?: number; timeoutMs?: number; toleranceSec?: number; fetchImpl?: typeof fetch };
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Tolerant parser: Verify.et may nest the result under `verification`. `verified` must be exactly `true`. */
export function parseOutcome(body: unknown): VerificationOutcome {
  const b = obj(body); const v = obj(b.verification); const src = Object.keys(v).length ? v : b;
  const verified = (b.verified ?? src.verified) === true;
  const amt = Number(src.amount ?? b.amount); const amountMinor = Number.isFinite(amt) && amt > 0 ? Math.round(amt * 100) : undefined;
  const cur = src.currency ?? b.currency;
  return { verified, amountMinor, currency: typeof cur === "string" ? cur.toUpperCase() : amountMinor !== undefined ? "ETB" : undefined, reason: typeof (src.reason ?? b.reason ?? b.error) === "string" ? String(src.reason ?? b.reason ?? b.error).slice(0, 200) : undefined, raw: b };
}

export class VerifyEtPaymentProvider implements PaymentProvider {
  readonly name = "verify-et";
  readonly supportedMethods: readonly string[] = PAYMENT_METHODS;
  constructor(private cfg: Cfg) {}
  private get base() { return (this.cfg.baseUrl ?? "https://verify.et").replace(/\/+$/, ""); }

  async submitVerification(i: SubmitInput): Promise<SubmitResult> {
    const form = new FormData();
    form.append("image", new Blob([i.receipt.bytes as unknown as BlobPart], { type: i.receipt.mime }), i.receipt.filename);
    form.append("bank", i.method);
    if (i.transactionReference) form.append("reference", i.transactionReference);
    let res: Response;
    try {
      res = await (this.cfg.fetchImpl ?? fetch)(`${this.base}/api/verify?waitMs=${this.cfg.waitMs ?? 5000}`, {
        method: "POST", headers: { "x-api-key": this.cfg.apiKey, "Idempotency-Key": i.idempotencyKey }, body: form, signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 20_000),
      });
    } catch (e) { throw new ProviderError((e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError" ? "TIMEOUT" : "UPSTREAM"); }
    const body = await res.json().catch(() => null);
    if (res.status === 200) return { httpStatus: 200, requestId: typeof obj(body).requestId === "string" ? (obj(body).requestId as string) : undefined, outcome: parseOutcome(body) };
    if (res.status === 202) {
      const requestId = obj(body).requestId; if (typeof requestId !== "string" || !requestId) throw new ProviderError("BAD_RESPONSE", 202);
      return { httpStatus: 202, requestId };
    }
    const kind = res.status === 400 || res.status === 422 ? "INVALID_RECEIPT" : res.status === 401 || res.status === 403 ? "AUTH" : res.status === 402 ? "CREDITS" : res.status === 404 ? "NOT_FOUND" : res.status === 409 ? "CONFLICT" : res.status === 429 ? "RATE_LIMITED" : res.status >= 500 ? "UPSTREAM" : "BAD_RESPONSE";
    throw new ProviderError(kind, res.status);
  }

  /** Signature = HMAC-SHA256(secret, `${timestamp}.${rawBody}`) hex (a body-only HMAC is also accepted). Timestamp must be fresh. */
  parseWebhook(raw: string, h: Headers, now = new Date()): WebhookEvent {
    const sig = (h.get("x-webhook-signature") ?? "").trim().replace(/^sha256=/i, "").toLowerCase(); const ts = h.get("x-webhook-timestamp") ?? "";
    const withTs = hmacSha256Hex(this.cfg.webhookSecret, `${ts}.${raw}`); const bodyOnly = hmacSha256Hex(this.cfg.webhookSecret, raw);
    if (!sig || !(timingSafeEqualHex(sig, withTs) || timingSafeEqualHex(sig, bodyOnly))) throw new AppError(401, "INVALID_SIGNATURE", "Invalid webhook signature");
    const n = Number(ts); const ms = n > 1e12 ? n : n * 1000;
    if (!Number.isFinite(ms) || Math.abs(now.getTime() - ms) > (this.cfg.toleranceSec ?? 300) * 1000) throw new AppError(401, "STALE_WEBHOOK", "Webhook timestamp outside tolerance");
    let json: unknown; try { json = JSON.parse(raw); } catch { throw new AppError(400, "BAD_REQUEST", "Malformed webhook body"); }
    const eventId = h.get("x-webhook-event-id"); if (!eventId) throw new AppError(400, "BAD_REQUEST", "Missing webhook event id");
    const b = obj(json); const data = obj(b.data); const payload = Object.keys(data).length ? data : b;
    const eventType = h.get("x-webhook-event") ?? (typeof b.event === "string" ? b.event : typeof b.type === "string" ? b.type : "");
    const rid = payload.requestId ?? b.requestId;
    return { eventId, eventType, requestId: typeof rid === "string" ? rid : undefined, outcome: eventType === "verification.completed" ? parseOutcome(payload) : undefined };
  }
}
