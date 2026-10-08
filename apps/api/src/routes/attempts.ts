import { Hono } from "hono";
import { v as zValidator } from "../utils/validate";
import { z } from "zod";
import { saveAnswersSchema } from "@dibora/validation";
import type { AttemptService } from "../services/attempt.service";
import type { AuthContext } from "../middleware/auth";
import { Errors } from "../utils/errors";
import { ok } from "../utils/response";

type Resolve = (userId: string) => Promise<{ studentId: string; isPremium: boolean } | null>;
/** Mounted behind requireAuth + requireStudent. */
export const attemptRoutes = (svc: AttemptService, resolve: Resolve) => {
  const r = new Hono();
  const ctx = async (c: { get: (k: string) => unknown }) => { const a = c.get("auth") as AuthContext; const s = await resolve(a.userId); if (!s) throw Errors.forbidden(); return s; };
  r.post("/", zValidator("json", z.object({ examId: z.string().uuid() })), async (c) => { const s = await ctx(c); return ok(c, await svc.start(s.studentId, c.req.valid("json").examId, s.isPremium), 201); });
  r.put("/:id/answers", zValidator("param", z.object({ id: z.string().uuid() })), zValidator("json", saveAnswersSchema), async (c) => { const s = await ctx(c); return ok(c, await svc.saveAnswers(s.studentId, c.req.valid("param").id, c.req.valid("json").answers)); });
  r.post("/:id/submit", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => { const s = await ctx(c); return ok(c, await svc.submit(s.studentId, c.req.valid("param").id)); });
  return r;
};
