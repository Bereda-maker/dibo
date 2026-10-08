import { Hono } from "hono";
import { v as zValidator } from "../utils/validate";
import { z } from "zod";
import { profileUpdateSchema, practiceAnswerSchema, practiceQuerySchema, aiMessageSchema } from "@dibora/validation";
import type { StudentService } from "../services/student.service";
import type { PracticeService } from "../services/practice.service";
import type { ProgressService } from "../services/progress.service";
import type { LearningService } from "../services/learning.service";
import type { AiChatService } from "../services/ai-chat.service";
import type { AuthContext } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { Errors } from "../utils/errors";
import { ok } from "../utils/response";

type Resolve = (userId: string) => Promise<{ studentId: string; isPremium: boolean } | null>;
type Deps = { students: StudentService; practice: PracticeService; progress: ProgressService; chat: AiChatService; learning: LearningService; resolve: Resolve };
const uuid = z.object({ id: z.string().uuid() });

/** Mounted behind requireAuth + requireStudent. All data is scoped to the signed-in student; ids from the client are never used to pick the student. */
export const studentRoutes = (d: Deps) => {
  const r = new Hono();
  const who = async (c: unknown) => { const a = (c as { get: (k: string) => unknown }).get("auth") as AuthContext; const s = await d.resolve(a.userId); if (!s) throw Errors.forbidden(); return { userId: a.userId, ...s }; };

  r.get("/students/me", async (c) => ok(c, await d.students.me((await who(c)).userId)));
  r.patch("/students/me", zValidator("json", profileUpdateSchema), async (c) => ok(c, await d.students.update((await who(c)).userId, c.req.valid("json"))));

  r.get("/practice/questions", zValidator("query", practiceQuerySchema), async (c) => { const w = await who(c); const q = c.req.valid("query"); return ok(c, await d.practice.next(w.studentId, q)); });
  r.post("/practice/answer", rateLimit({ limit: 120, windowMs: 60_000, prefix: "practice", keyBy: "user" }), zValidator("json", practiceAnswerSchema), async (c) => { const w = await who(c); return ok(c, await d.practice.answer(w.studentId, w.userId, w.isPremium, c.req.valid("json"))); });

  r.get("/progress", async (c) => ok(c, await d.progress.summary((await who(c)).studentId)));
  r.get("/recommendations", async (c) => { const w = await who(c); return ok(c, w.isPremium ? await d.progress.recommendations(w.studentId) : (await d.progress.recommendations(w.studentId, 1))); }); // free: top recommendation only
  r.get("/achievements", async (c) => ok(c, await d.students.achievements((await who(c)).studentId)));
  r.get("/notifications", async (c) => ok(c, await d.students.notifications((await who(c)).userId)));
  r.post("/notifications/read-all", async (c) => { await d.students.markAllRead((await who(c)).userId); return ok(c, { done: true }); });

  r.get("/ai/conversations", async (c) => ok(c, await d.chat.list((await who(c)).userId)));
  r.get("/ai/conversations/:id/messages", zValidator("param", uuid), async (c) => ok(c, await d.chat.messages((await who(c)).userId, c.req.valid("param").id)));
  r.patch("/ai/conversations/:id", zValidator("param", uuid), zValidator("json", z.object({ title: z.string().trim().min(1).max(80) })), async (c) => { await d.chat.rename((await who(c)).userId, c.req.valid("param").id, c.req.valid("json").title); return ok(c, { done: true }); });
  r.delete("/ai/conversations/:id", zValidator("param", uuid), async (c) => { await d.chat.remove((await who(c)).userId, c.req.valid("param").id); return ok(c, { done: true }); });
  r.post("/ai/messages", rateLimit({ limit: 20, windowMs: 60_000, prefix: "ai", keyBy: "user" }), zValidator("json", aiMessageSchema), async (c) => { const w = await who(c); return ok(c, await d.chat.send(w.userId, w.studentId, w.isPremium, c.req.valid("json"))); });
  r.get("/exams", async (c) => { const w = await who(c); return ok(c, await d.learning.exams(w.studentId, w.isPremium)); });
  r.get("/attempts/:id", zValidator("param", uuid), async (c) => ok(c, await d.learning.attempt((await who(c)).studentId, c.req.valid("param").id)));
  r.get("/bookmarks", async (c) => ok(c, await d.learning.bookmarks((await who(c)).studentId)));
  const bm = z.object({ type: z.enum(["NOTE", "QUESTION", "TOPIC"]), id: z.string().uuid() });
  r.post("/bookmarks", zValidator("json", bm), async (c) => { const b = c.req.valid("json"); await d.learning.addBookmark((await who(c)).studentId, b.type, b.id); return ok(c, { done: true }, 201); });
  r.delete("/bookmarks", zValidator("json", bm), async (c) => { const b = c.req.valid("json"); await d.learning.removeBookmark((await who(c)).studentId, b.type, b.id); return ok(c, { done: true }); });
  r.get("/notes/completed", async (c) => ok(c, await d.learning.completedNotes((await who(c)).studentId)));
  r.post("/notes/:id/complete", zValidator("param", uuid), async (c) => { const w = await who(c); return ok(c, await d.learning.completeNote(w.studentId, w.userId, c.req.valid("param").id)); });
  r.get("/leaderboard", zValidator("query", z.object({ period: z.enum(["weekly", "monthly", "overall"]).default("weekly") })), async (c) => ok(c, await d.learning.leaderboard(c.req.valid("query").period)));
  r.get("/search", zValidator("query", z.object({ q: z.string().trim().min(2).max(60), kinds: z.string().optional() })), async (c) => { const q = c.req.valid("query"); return ok(c, await d.learning.search(q.q, q.kinds?.split(","))); });
  r.get("/practice/wrong", async (c) => ok(c, await d.practice.wrong((await who(c)).studentId)));
  r.get("/students/me/export", async (c) => { const w = await who(c); return ok(c, await d.students.exportData(w.userId, w.studentId)); });
  r.delete("/students/me", async (c) => { const w = await who(c); await d.students.deleteAccount(w.userId); (c as unknown as { header: (k: string, v: string) => void }).header("Set-Cookie", "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"); return ok(c, { deleted: true }); });
  return r;
};
