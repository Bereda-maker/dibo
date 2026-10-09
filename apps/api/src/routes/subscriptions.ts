import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { v as zValidator } from "../utils/validate";
import { z } from "zod";
import type { CheckoutService } from "../services/payments/checkout.service";
import type { PaymentService } from "../services/payments/payment.service";
import type { AuthContext } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { MAX_RECEIPT_BYTES } from "../services/payments/receipt";
import { Errors } from "../utils/errors";
import { ok } from "../utils/response";

export const publicPlanRoutes = (checkout: CheckoutService) => new Hono().get("/plans", async (c) => ok(c, await checkout.plans()));

const ref = z.string().min(8).max(80);
/** Behind requireAuth. The browser only ever talks to these endpoints; Verify.et is called server-side. */
export const subscriptionRoutes = (checkout: CheckoutService, payments: PaymentService) => {
  const r = new Hono();
  const uid = (c: unknown) => ((c as { get: (k: string) => unknown }).get("auth") as AuthContext).userId;
  r.post("/checkout", rateLimit({ limit: 10, windowMs: 60_000, prefix: "checkout", keyBy: "user" }), zValidator("json", z.object({ planCode: z.string().min(1).max(40) })), async (c) => ok(c, await checkout.start(uid(c), c.req.valid("json").planCode), 201));
  r.post("/payments/:reference/submit", rateLimit({ limit: 6, windowMs: 60_000, prefix: "pay-submit", keyBy: "user" }),
    bodyLimit({ maxSize: MAX_RECEIPT_BYTES + 256 * 1024, onError: (c) => c.json({ success: false, error: { code: "BAD_REQUEST", message: "Receipt image must be 8 MB or smaller" } }, 413) }),
    zValidator("param", z.object({ reference: ref })), async (c) => {
      const form = await c.req.parseBody();
      const f = form["image"]; if (!(f instanceof File)) throw Errors.badRequest("Receipt image is required");
      const f2 = z.object({ method: z.string().min(2).max(30), transactionReference: z.string().max(64).optional() }).safeParse({ method: form["method"], transactionReference: typeof form["transactionReference"] === "string" ? form["transactionReference"] : undefined });
      if (!f2.success) throw f2.error;
      return ok(c, await payments.submit(uid(c), c.req.valid("param").reference, { ...f2.data, bytes: new Uint8Array(await f.arrayBuffer()) }));
    });
  r.get("/payment-info", (c) => ok(c, checkout.info()));
  /** Display-only status for the return page. The client never reports status; the webhook is the source of truth. */
  r.get("/payments/:reference", zValidator("param", z.object({ reference: ref })), async (c) => ok(c, await payments.status(uid(c), c.req.valid("param").reference)));
  return r;
};
