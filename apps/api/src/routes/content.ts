import { Hono } from "hono";
import { and, asc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { v as zValidator } from "../utils/validate";
import { subjects, topics, learningMaterials, notes, studentProfiles, type Db } from "@dibora/database";
import type { AuthContext } from "../middleware/auth";
import { ok } from "../utils/response";
import { Errors } from "../utils/errors";

/** Read-only published curriculum for signed-in students. Drafts and archived items are never returned. */
/** Public (no login): needed by the registration form. */
export const publicContentRoutes = (db: Db) => new Hono().get("/subjects", async (c) => ok(c, await db.select({ id: subjects.id, names: subjects.names, grade: subjects.grade, stream: subjects.stream }).from(subjects).where(eq(subjects.status, "PUBLISHED")).orderBy(asc(subjects.sortOrder))));

export const contentRoutes = (db: Db) => {
  const r = new Hono();
  const selectedFor = async (c: unknown) => {
    const auth = (c as { get: (key: string) => unknown }).get("auth") as AuthContext;
    const [profile] = await db.select({ ids: studentProfiles.selectedSubjectIds }).from(studentProfiles).where(eq(studentProfiles.userId, auth.userId)).limit(1);
    return profile?.ids ?? [];
  };
  /** A selected subject represents the student's subject choice across the Grade 9–12 curriculum. */
  const notesSubjectIds = async (c: unknown) => {
    const selectedIds = await selectedFor(c);
    if (!selectedIds.length) {
      const available = await db.select({ id: subjects.id }).from(subjects)
        .where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.grade, [9, 10, 11, 12])));
      return available.map((subject) => subject.id);
    }
    const selected = await db.select({ slug: subjects.slug, educationLevel: subjects.educationLevel, stream: subjects.stream }).from(subjects)
      .where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.id, selectedIds)));
    if (!selected.length) return [];
    const scopes = selected.map((subject) => and(
      eq(subjects.slug, subject.slug),
      eq(subjects.educationLevel, subject.educationLevel),
      subject.stream ? or(eq(subjects.stream, subject.stream), isNull(subjects.stream)) : isNull(subjects.stream),
    ));
    const available = await db.select({ id: subjects.id }).from(subjects).where(and(
      eq(subjects.status, "PUBLISHED"), inArray(subjects.grade, [9, 10, 11, 12]), or(...scopes),
    ));
    return available.map((subject) => subject.id);
  };

  r.get("/subjects", zValidator("query", z.object({ scope: z.literal("notes").optional() })), async (c) => {
    const { scope } = c.req.valid("query");
    const allowedIds = scope === "notes" ? await notesSubjectIds(c) : await selectedFor(c);
    return ok(c, await db.select({ id: subjects.id, slug: subjects.slug, names: subjects.names, grade: subjects.grade, stream: subjects.stream })
      .from(subjects).where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.id, allowedIds))).orderBy(asc(subjects.sortOrder), asc(subjects.grade)));
  });
  r.get("/topics", zValidator("query", z.object({ subjectId: z.string().uuid() })), async (c) =>
    ok(c, await db.select({ id: topics.id, slug: topics.slug, names: topics.names }).from(topics).where(and(eq(topics.subjectId, c.req.valid("query").subjectId), eq(topics.status, "PUBLISHED"), inArray(topics.subjectId, await selectedFor(c)))).orderBy(asc(topics.sortOrder))));
  r.get("/notes", zValidator("query", z.object({ topicId: z.string().uuid().optional(), subjectId: z.string().uuid().optional(), q: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })), async (c) => {
    const { topicId, subjectId, q, limit } = c.req.valid("query");
    const conds = [
      eq(learningMaterials.status, "PUBLISHED"), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"),
      topicId ? eq(learningMaterials.topicId, topicId) : undefined,
      subjectId ? eq(topics.subjectId, subjectId) : undefined,
      q ? or(ilike(notes.title, `%${q.replace(/[%_]/g, "")}%`), ilike(notes.summary, `%${q.replace(/[%_]/g, "")}%`)) : undefined,
    ].filter(Boolean) as never[];
    const allowedIds = await notesSubjectIds(c);
    return ok(c, await db.select({ id: notes.id, title: notes.title, summary: notes.summary, topicId: learningMaterials.topicId, topicName: topics.names, topicSlug: topics.slug, subjectId: topics.subjectId, grade: subjects.grade })
      .from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(...conds, inArray(topics.subjectId, allowedIds))).orderBy(asc(topics.sortOrder), asc(learningMaterials.sortOrder), asc(notes.title)).limit(limit));
  });
  r.get("/notes/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
    const [n] = await db.select().from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(eq(notes.id, c.req.valid("param").id), eq(learningMaterials.status, "PUBLISHED"), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"), inArray(topics.subjectId, await notesSubjectIds(c)))).limit(1);
    if (!n) throw Errors.notFound("Note");
    return ok(c, { id: n.notes.id, title: n.notes.title, summary: n.notes.summary, content: n.notes.content, topicId: n.learning_materials.topicId });
  });
  return r;
};
