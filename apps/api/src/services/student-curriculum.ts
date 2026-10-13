import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { studentProfiles, subjects, type Db } from "@dibora/database";

type StudentRef = { profileId?: string; userId?: string };
type CurriculumSubject = {
  id: string;
  educationLevel: string;
  slug: string;
  names: Record<string, string>;
  grade: number;
  stream: string | null;
  subjectKey: string;
};

const GRADES = [9, 10, 11, 12];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cleanName = (subject: Pick<CurriculumSubject, "slug" | "names">) =>
  (subject.names.en || subject.slug).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const keyOf = (subject: Pick<CurriculumSubject, "educationLevel" | "slug" | "names">) => `${subject.educationLevel}:${cleanName(subject)}`;

/**
 * Return the published Grades 9–12 curriculum visible to one student.
 * A selected subject is treated as a subject family across grades, since each
 * grade has its own subject row/ID. Empty or stale selections fail open to the
 * available secondary curriculum so legacy profiles are not left with blank pages.
 */
export async function studentCurriculumSubjects(db: Db, ref: StudentRef): Promise<CurriculumSubject[]> {
  const profileWhere = ref.profileId
    ? eq(studentProfiles.id, ref.profileId)
    : ref.userId
      ? eq(studentProfiles.userId, ref.userId)
      : undefined;
  if (!profileWhere) return [];

  const [profile] = await db.select({
    subjectIds: studentProfiles.selectedSubjectIds,
    educationLevel: studentProfiles.educationLevel,
  }).from(studentProfiles).where(profileWhere).limit(1);
  if (!profile) return [];

  const columns = {
    id: subjects.id,
    educationLevel: subjects.educationLevel,
    slug: subjects.slug,
    names: subjects.names,
    grade: subjects.grade,
    stream: subjects.stream,
  };
  const available = await db.select(columns).from(subjects).where(and(
    eq(subjects.status, "PUBLISHED"),
    isNull(subjects.deletedAt),
    eq(subjects.educationLevel, profile.educationLevel),
    inArray(subjects.grade, GRADES),
  )).orderBy(asc(subjects.sortOrder), asc(subjects.grade));

  const rawIds = Array.isArray(profile.subjectIds) ? profile.subjectIds : [];
  const selectedIds = rawIds.filter((id): id is string => typeof id === "string" && UUID.test(id));
  if (!selectedIds.length) return available.map((subject) => ({ ...subject, subjectKey: keyOf(subject) }));

  const selected = await db.select({
    educationLevel: subjects.educationLevel,
    slug: subjects.slug,
    names: subjects.names,
    stream: subjects.stream,
  }).from(subjects).where(and(
    eq(subjects.status, "PUBLISHED"),
    isNull(subjects.deletedAt),
    eq(subjects.educationLevel, profile.educationLevel),
    inArray(subjects.id, selectedIds),
  ));
  // Older profiles can contain subject IDs that were removed or unpublished.
  if (!selected.length) return available.map((subject) => ({ ...subject, subjectKey: keyOf(subject) }));

  return available.flatMap((candidate) => {
    const match = selected.find((choice) => choice.educationLevel === candidate.educationLevel &&
      (choice.slug === candidate.slug || cleanName(choice) === cleanName(candidate)) &&
      (choice.stream ? candidate.stream === choice.stream || candidate.stream === null : candidate.stream === null));
    return match ? [{ ...candidate, subjectKey: keyOf(match) }] : [];
  });
}

export async function studentCurriculumSubjectIds(db: Db, ref: StudentRef): Promise<string[]> {
  return (await studentCurriculumSubjects(db, ref)).map((subject) => subject.id);
}
