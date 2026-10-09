import { Hono } from "hono";
import type { PaymentService } from "../services/payments/payment.service";
import { ok } from "../utils/response";

/** Public webhook (POST /api/webhooks/verify-et): authenticated by HMAC signature + fresh timestamp, not by cookies. Needs the RAW body. */
export const webhookRoutes = (payments: PaymentService) => {
  const r = new Hono();
  r.post("/verify-et", async (c) => ok(c, await payments.handleWebhook(await c.req.text(), c.req.raw.headers)));
  return r;
};
