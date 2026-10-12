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
  const cleanName = (subject: { slug: string; names: Record<string, string> }) => (subject.names.en || subject.slug).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const subjectKeyOf = (subject: { educationLevel: string; slug: string; names: Record<string, string> }) => `${subject.educationLevel}:${cleanName(subject)}`;
  const gradeInTitle = (title: string) => {
    const match = title.match(/\b(?:grade|gr\.?|g)\s*(9|10|11|12)\b/i);
    return match ? Number(match[1]) : null;
  };

  /** Grade 12 exam candidates can browse the same selected subjects across the Grades 9–12 curriculum. */
  const notesSubjects = async (c: unknown) => {
    const selectedIds = await selectedFor(c);
    const columns = { id: subjects.id, educationLevel: subjects.educationLevel, slug: subjects.slug, names: subjects.names, grade: subjects.grade, stream: subjects.stream };
    const gradeScope = and(eq(subjects.status, "PUBLISHED"), inArray(subjects.grade, [9, 10, 11, 12]));
    if (!selectedIds.length) {
      const available = await db.select(columns).from(subjects).where(gradeScope).orderBy(asc(subjects.sortOrder), asc(subjects.grade));
      return available.map((subject) => ({ ...subject, subjectKey: subjectKeyOf(subject) }));
    }
    const selected = await db.select({ educationLevel: subjects.educationLevel, slug: subjects.slug, names: subjects.names, stream: subjects.stream }).from(subjects)
      .where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.id, selectedIds)));
    if (!selected.length) return [];
    const candidates = await db.select(columns).from(subjects).where(gradeScope).orderBy(asc(subjects.sortOrder), asc(subjects.grade));
    return candidates.flatMap((candidate) => {
      const match = selected.find((choice) => choice.educationLevel === candidate.educationLevel &&
        (choice.slug === candidate.slug || cleanName(choice) === cleanName(candidate)) &&
        (choice.stream ? candidate.stream === choice.stream || candidate.stream === null : candidate.stream === null));
      return match ? [{ ...candidate, subjectKey: subjectKeyOf(match) }] : [];
    });
  };
  const notesSubjectIds = async (c: unknown) => (await notesSubjects(c)).map((subject) => subject.id);

  r.get("/subjects", zValidator("query", z.object({ scope: z.literal("notes").optional() })), async (c) => {
    const { scope } = c.req.valid("query");
    if (scope === "notes") return ok(c, await notesSubjects(c));
    return ok(c, await db.select({ id: subjects.id, slug: subjects.slug, names: subjects.names, grade: subjects.grade, stream: subjects.stream })
      .from(subjects).where(and(eq(subjects.status, "PUBLISHED"), inArray(subjects.id, await selectedFor(c)))).orderBy(asc(subjects.sortOrder), asc(subjects.grade)));
  });
  r.get("/topics", zValidator("query", z.object({ subjectId: z.string().uuid() })), async (c) =>
    ok(c, await db.select({ id: topics.id, slug: topics.slug, names: topics.names }).from(topics).where(and(eq(topics.subjectId, c.req.valid("query").subjectId), eq(topics.status, "PUBLISHED"), inArray(topics.subjectId, await selectedFor(c)))).orderBy(asc(topics.sortOrder))));
  r.get("/notes", zValidator("query", z.object({ topicId: z.string().uuid().optional(), subjectId: z.string().uuid().optional(), subjectKey: z.string().max(240).optional(), grade: z.coerce.number().int().min(9).max(12).optional(), q: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })), async (c) => {
    const { topicId, subjectId, subjectKey, grade, q, limit } = c.req.valid("query");
    const conds = [
      eq(learningMaterials.status, "PUBLISHED"), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"),
      topicId ? eq(learningMaterials.topicId, topicId) : undefined,
      subjectId ? eq(topics.subjectId, subjectId) : undefined,
      q ? or(ilike(notes.title, `%${q.replace(/[%_]/g, "")}%`), ilike(notes.summary, `%${q.replace(/[%_]/g, "")}%`)) : undefined,
    ].filter(Boolean) as never[];
    const accessibleSubjects = await notesSubjects(c);
    const allowedIds = subjectKey ? accessibleSubjects.filter((subject) => subject.subjectKey === subjectKey).map((subject) => subject.id) : accessibleSubjects.map((subject) => subject.id);
    const rows = await db.select({ id: notes.id, title: notes.title, summary: notes.summary, topicId: learningMaterials.topicId, topicName: topics.names, topicSlug: topics.slug, subjectId: topics.subjectId, grade: subjects.grade })
      .from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(...conds, inArray(topics.subjectId, allowedIds))).orderBy(asc(topics.sortOrder), asc(learningMaterials.sortOrder), asc(notes.title));
    return ok(c, rows.filter((note) => grade == null || (gradeInTitle(note.title) ?? note.grade) === grade).slice(0, limit));
  });
  r.get("/notes/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
    const [n] = await db.select().from(notes).innerJoin(learningMaterials, eq(learningMaterials.id, notes.materialId)).innerJoin(topics, eq(topics.id, learningMaterials.topicId)).innerJoin(subjects, eq(subjects.id, topics.subjectId))
      .where(and(eq(notes.id, c.req.valid("param").id), eq(learningMaterials.status, "PUBLISHED"), eq(topics.status, "PUBLISHED"), eq(subjects.status, "PUBLISHED"), inArray(topics.subjectId, await notesSubjectIds(c)))).limit(1);
    if (!n) throw Errors.notFound("Note");
    return ok(c, { id: n.notes.id, title: n.notes.title, summary: n.notes.summary, content: n.notes.content, topicId: n.learning_materials.topicId });
  });
  return r;
};
