import { Hono } from "hono";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { subjects, topics, learningMaterials, notes, type Db } from "@dibora/database";
import { ok } from "../utils/response";
import { Errors } from "../utils/errors";

/** Read-only published curriculum for signed-in students. Drafts and archived items are never returned. */
export const contentRoutes = (db: Db) => {
  const r = new Hono();
  r.get("/subjects", async (c) => ok(c, await db.select({ id: subjects.id, slug: subjects.slug, names: subjects.names, grade: subjects.grade, stream: subjects.stream }).from(subjects).where(and(eq(subjects.status, "PUBLISHED"))).orderBy(asc(subjects.sortOrder))));
  r.get("/topics", zValidator("query", z.object({ subjectId: z.string().uuid() })), async (c) =>
    ok(c, await db.select({ id: topics.id, slug: topics.slug, names: topics.names }).from(topics).where(and(eq(topics.subjectId, c.req.valid("query").subjectId), eq(topics.status, "PUBLISHED"))).orderBy(asc(topics.sortOrder))));
  r.get("/notes", zValidator("query", z.object({ topicId: z.string().uuid().optional(), q: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })), async (c) => {
    const { topicId, q, limit } = c.req.valid("query");
    const conds = [eq(learningMaterials.status, "PUBLISHED"), topicId ? eq(learningMaterials.topicId, topicId) : undefined, q ? or(ilike(notes.title, `%${q.replace(/[%_]/g, "")}%`), ilike(notes.summary, `%${q.replace(/[%_]/g, "")}%`)) : undefined].filter(Boolean) as never[];
    return ok(c, await db.select({ id: notes.id, title: notes.title, summary: notes.summary, topicId: learningMaterials.topicId }).from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).where(and(...conds)).limit(limit));
  });
  r.get("/notes/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
    const [n] = await db.select().from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).where(and(eq(notes.id, c.req.valid("param").id), eq(learningMaterials.status, "PUBLISHED"))).limit(1);
    if (!n) throw Errors.notFound("Note"); return ok(c, { id: n.notes.id, title: n.notes.title, summary: n.notes.summary, content: n.notes.content, topicId: n.learning_materials.topicId });
  });
  return r;
};
