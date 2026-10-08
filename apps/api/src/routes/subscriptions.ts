import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { CheckoutService } from "../services/payments/checkout.service";
import type { PaymentService } from "../services/payments/payment.service";
import type { AuthContext } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { ok } from "../utils/response";

export const publicPlanRoutes = (checkout: CheckoutService) => new Hono().get("/plans", async (c) => ok(c, await checkout.plans()));

/** Behind requireAuth. */
export const subscriptionRoutes = (checkout: CheckoutService, payments: PaymentService, defaultProvider: string) => {
  const r = new Hono();
  r.post("/checkout", rateLimit({ limit: 10, windowMs: 60_000, prefix: "checkout", keyBy: "user" }), zValidator("json", z.object({ planCode: z.string().min(1).max(40), provider: z.string().optional() })), async (c) => {
    const a = (c as unknown as { get: (k: string) => unknown }).get("auth") as AuthContext; const b = c.req.valid("json");
    return ok(c, await checkout.start(a.userId, b.planCode, b.provider ?? defaultProvider), 201);
  });
  // Called by the return page: asks the server to verify with the provider. The client never reports status.
  r.post("/verify", zValidator("json", z.object({ reference: z.string().min(8).max(80), provider: z.string().optional() })), async (c) => {
    const b = c.req.valid("json"); return ok(c, await payments.reconcile(b.provider ?? defaultProvider, b.reference));
  });
  return r;
};
