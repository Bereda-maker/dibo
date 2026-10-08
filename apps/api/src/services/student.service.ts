import { and, desc, eq, isNull } from "drizzle-orm";
import { achievements, notifications, studentAchievements, studentProfiles, users, type Db } from "@dibora/database";
import type { z } from "zod";
import type { profileUpdateSchema } from "@dibora/validation";
import { Errors } from "../utils/errors";

const PROFILE_FIELDS = ["fullName", "phone", "school", "region", "city", "stream", "examYear", "displayName", "leaderboardOptIn"] as const;
export class StudentService {
  constructor(private db: Db) {}
  async me(userId: string) {
    const [r] = await this.db.select({ p: studentProfiles, email: users.email, role: users.role }).from(studentProfiles).innerJoin(users, eq(users.id, studentProfiles.userId)).where(and(eq(studentProfiles.userId, userId), isNull(studentProfiles.deletedAt)));
    if (!r) throw Errors.notFound("Profile");
    const p = r.p; return { id: p.id, email: r.email, fullName: p.fullName, phone: p.phone, school: p.school, region: p.region, city: p.city, grade: p.grade, educationLevel: p.educationLevel, stream: p.stream, examYear: p.examYear, displayName: p.displayName, subjectIds: p.selectedSubjectIds, learningStatus: p.learningStatus, subscriptionStatus: p.subscriptionStatus, leaderboardOptIn: p.leaderboardOptIn };
  }
  async update(userId: string, patch: z.infer<typeof profileUpdateSchema>) {
    const set: Record<string, unknown> = { updatedAt: new Date() }; for (const k of PROFILE_FIELDS) if (patch[k] !== undefined) set[k] = patch[k];
    if (patch.subjectIds) set.selectedSubjectIds = patch.subjectIds;
    const [cur] = await this.db.select({ s: studentProfiles.learningStatus }).from(studentProfiles).where(eq(studentProfiles.userId, userId));
    if (cur?.s === "PROFILE_INCOMPLETE" || cur?.s === "REGISTERED") set.learningStatus = "DIAGNOSTIC_PENDING"; // profile step done -> next is the diagnostic
    await this.db.update(studentProfiles).set(set).where(eq(studentProfiles.userId, userId)); return this.me(userId);
  }
  notifications(userId: string) { return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50); }
  async markAllRead(userId: string) { await this.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))); }
  async achievements(studentId: string) {
    const all = await this.db.select().from(achievements); const mine = await this.db.select().from(studentAchievements).where(eq(studentAchievements.studentId, studentId));
    return all.map((a) => ({ code: a.code, names: a.names, points: a.points, unlockedAt: mine.find((m) => m.achievementId === a.id)?.unlockedAt ?? null }));
  }
}
