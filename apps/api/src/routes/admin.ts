import { Hono } from "hono";
import { v as zValidator } from "../utils/validate";
import { z } from "zod";
import { questionUpsertSchema } from "@dibora/validation";
import type { AdminService } from "../services/admin.service";
import { requireSuperAdmin, type AuthContext } from "../middleware/auth";
import { ok } from "../utils/response";

/** Mounted behind requireAuth + requireAdmin. Every mutating action writes an audit log entry. */
export const adminRoutes = (admin: AdminService) => {
  const r = new Hono();
  const actor = (c: { get: (k: string) => unknown; req: { header: (n: string) => string | undefined } }) => ({ userId: (c.get("auth") as AuthContext).userId, ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(), requestId: c.get("requestId") as string | undefined });
  const id = z.object({ id: z.string().uuid() });
  r.get("/overview", async (c) => ok(c, await admin.overview()));
  r.get("/students", zValidator("query", z.object({ q: z.string().max(60).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional(), limit: z.coerce.number().int().min(1).max(100).default(25), offset: z.coerce.number().int().min(0).default(0) })), async (c) => ok(c, await admin.students(c.req.valid("query"))));
  r.patch("/students/:userId/status", zValidator("param", z.object({ userId: z.string().uuid() })), zValidator("json", z.object({ active: z.boolean() })), async (c) => { await admin.setActive(actor(c as never), c.req.valid("param").userId, c.req.valid("json").active); return ok(c, { done: true }); });
  r.delete("/students/:userId", requireSuperAdmin, zValidator("param", z.object({ userId: z.string().uuid() })), async (c) => { await admin.deleteStudent(actor(c as never), c.req.valid("param").userId); return ok(c, { done: true }); });
  r.post("/questions", zValidator("json", questionUpsertSchema), async (c) => ok(c, await admin.createQuestion(actor(c as never), c.req.valid("json")), 201));
  r.post("/questions/:id/publish", zValidator("param", id), async (c) => { await admin.setQuestionStatus(actor(c as never), c.req.valid("param").id, "PUBLISHED"); return ok(c, { done: true }); });
  r.post("/questions/:id/unpublish", zValidator("param", id), async (c) => { await admin.setQuestionStatus(actor(c as never), c.req.valid("param").id, "DRAFT"); return ok(c, { done: true }); });
  r.post("/questions/:id/archive", zValidator("param", id), async (c) => { await admin.setQuestionStatus(actor(c as never), c.req.valid("param").id, "ARCHIVED"); return ok(c, { done: true }); });
  r.patch("/plans/:code", requireSuperAdmin, zValidator("json", z.object({ priceMinor: z.number().int().min(0).max(100_000_000).optional(), names: z.record(z.string()).optional(), isActive: z.boolean().optional() })), async (c) => { await admin.updatePlan(actor(c as never), c.req.param("code"), c.req.valid("json")); return ok(c, { done: true }); });
  r.get("/audit-logs", async (c) => ok(c, await admin.auditLog()));
  r.get("/contact-messages", zValidator("query", z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) })), async (c) => ok(c, await admin.listContactMessages(c.req.valid("query").limit)));
  r.patch("/contact-messages/:id", zValidator("param", id), zValidator("json", z.object({ status: z.enum(["NEW", "READ", "RESOLVED"]) })), async (c) => { await admin.setContactMessageStatus(actor(c as never), c.req.valid("param").id, c.req.valid("json").status); return ok(c, { done: true }); });
  return r;
};
