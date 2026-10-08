import { Hono } from "hono";
import { z } from "zod";
import type { PaymentService } from "../services/payments/payment.service";
import { ok } from "../utils/response";

/** Public webhook: authenticated by provider signature + server-side re-verification, not by cookies. */
export const paymentRoutes = (payments: PaymentService) => {
  const r = new Hono();
  r.post("/webhook/:provider", async (c) => {
    const raw = await c.req.text(); // raw body required for signature verification
    const body = z.object({ tx_ref: z.string().min(1) }).parse(JSON.parse(raw));
    const result = await payments.handleWebhook(c.req.param("provider"), raw, c.req.raw.headers, body.tx_ref);
    return ok(c, result);
  });
  return r;
};
