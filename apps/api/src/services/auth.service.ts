import { and, eq, gt } from "drizzle-orm";
import { users, sessions, studentProfiles, studentProgress, type Db } from "@dibora/database";
import type { RegisterInput } from "@dibora/validation";
import type { Role } from "@dibora/types";
import { AppError, Errors } from "../utils/errors";

const SESSION_DAYS = 14;
const sha256 = async (s: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).toString("hex");

export class AuthService {
  constructor(private db: Db) {}

  async register(input: RegisterInput) {
    const passwordHash = await Bun.password.hash(input.password, { algorithm: "argon2id" });
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ email: input.email, passwordHash, role: "STUDENT" }).returning({ id: users.id });
        const [profile] = await tx.insert(studentProfiles).values({
          userId: user!.id, fullName: input.fullName, phone: input.phone, school: input.school,
          region: input.region, city: input.city, educationLevel: input.educationLevel, grade: input.grade,
          stream: input.stream, examYear: input.examYear, selectedSubjectIds: input.subjectIds,
          learningStatus: "REGISTERED", subscriptionStatus: "FREE", consentAcceptedAt: new Date(),
        }).returning({ id: studentProfiles.id });
        await tx.insert(studentProgress).values({ studentId: profile!.id });
        return { userId: user!.id, studentId: profile!.id };
      });
    } catch (e: unknown) {
      if (typeof e === "object" && e && (e as { code?: string }).code === "23505") throw Errors.conflict("An account with this email already exists");
      throw e;
    }
  }

  async login(email: string, password: string) {
    const [u] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    // Verify against a dummy hash when the user is missing to keep timing uniform.
    const hash = u?.passwordHash ?? "$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await Bun.password.verify(password, hash).catch(() => false);
    if (!u || !valid || !u.isActive || u.deletedAt) throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    await this.db.insert(sessions).values({ userId: u.id, tokenHash: await sha256(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) });
    return { token, role: u.role as Role, maxAgeSeconds: SESSION_DAYS * 86400 };
  }

  async validateSession(token: string) {
    const [row] = await this.db
      .select({ sessionId: sessions.id, userId: users.id, role: users.role, active: users.isActive })
      .from(sessions).innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, await sha256(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!row || !row.active) return null;
    return { userId: row.userId, role: row.role as Role, sessionId: row.sessionId };
  }

  async logout(token: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  }
}
