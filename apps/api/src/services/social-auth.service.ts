import { and, eq } from "drizzle-orm";
import { users, sessions, studentProfiles, studentProgress, authIdentities, type Db } from "@dibora/database";
import type { AuthService } from "./auth.service";
import { GoogleIdTokenVerifier, verifyTelegramLogin } from "./social-verifiers";
import { AppError } from "../utils/errors";

type Provider = "google" | "telegram";
type Cfg = { google?: GoogleIdTokenVerifier; telegram?: { botToken: string; botUsername: string } };
const unavailable = () => new AppError(403, "ACCOUNT_UNAVAILABLE", "This account is unavailable. Please contact support.");
const isUnique = (e: unknown) => typeof e === "object" && !!e && ((e as { code?: string }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505");

export class SocialAuthService {
  constructor(private db: Db, private auth: AuthService, private cfg: Cfg) {}

  /** What the web UI may show. Only public values (client id, bot username) are returned. */
  providers() { return { google: this.cfg.google ? { clientId: this.cfg.google.clientId } : null, telegram: this.cfg.telegram ? { botUsername: this.cfg.telegram.botUsername } : null }; }

  async loginWithGoogle(credential: string) {
    if (!this.cfg.google) throw new AppError(404, "NOT_FOUND", "Google sign-in is not enabled");
    const g = await this.cfg.google.verify(credential);
    return this.finish(await this.resolve("google", g.sub, { email: g.email, name: g.name, linkByEmail: true }));
  }

  async loginWithTelegram(data: Record<string, unknown>) {
    if (!this.cfg.telegram) throw new AppError(404, "NOT_FOUND", "Telegram sign-in is not enabled");
    const t = verifyTelegramLogin(data, this.cfg.telegram.botToken);
    // Telegram provides no email: the placeholder keeps users.email unique and can never receive mail.
    return this.finish(await this.resolve("telegram", t.id, { email: `tg_${t.id}@telegram.invalid`, name: t.name || "Telegram user", linkByEmail: false }));
  }

  private async finish(r: { userId: string; isNew: boolean }) {
    const [u] = await this.db.select({ role: users.role }).from(users).where(eq(users.id, r.userId)).limit(1);
    const s = await this.auth.createSession(r.userId, u!.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN");
    return { ...s, isNew: r.isNew };
  }

  private async findIdentity(provider: Provider, pid: string) {
    const [row] = await this.db.select({ userId: users.id, active: users.isActive, deletedAt: users.deletedAt }).from(authIdentities)
      .innerJoin(users, eq(users.id, authIdentities.userId)).where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, pid))).limit(1);
    return row ?? null;
  }

  private async resolve(provider: Provider, pid: string, p: { email: string; name: string; linkByEmail: boolean }, retry = true): Promise<{ userId: string; isNew: boolean }> {
    const known = await this.findIdentity(provider, pid);
    if (known) { if (!known.active || known.deletedAt) throw unavailable(); return { userId: known.userId, isNew: false }; }
    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx.select().from(users).where(eq(users.email, p.email)).limit(1);
        if (existing) {
          if (!p.linkByEmail || !existing.isActive || existing.deletedAt) throw unavailable();
          if (!existing.emailVerifiedAt) {
            // Pre-hijack protection: nobody proved they own this email when the password account was made.
            // The provider just proved it, so drop any password/sessions set by someone else and mark the email verified.
            const unusable = await Bun.password.hash(crypto.randomUUID() + crypto.randomUUID(), { algorithm: "argon2id" });
            await tx.update(users).set({ passwordHash: unusable, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, existing.id));
            await tx.delete(sessions).where(eq(sessions.userId, existing.id));
          }
          await tx.insert(authIdentities).values({ userId: existing.id, provider, providerUserId: pid, email: p.email });
          return { userId: existing.id, isNew: false };
        }
        const unusable = await Bun.password.hash(crypto.randomUUID() + crypto.randomUUID(), { algorithm: "argon2id" });
        const [u] = await tx.insert(users).values({ email: p.email, passwordHash: unusable, role: "STUDENT", emailVerifiedAt: provider === "google" ? new Date() : null }).returning({ id: users.id });
        const [profile] = await tx.insert(studentProfiles).values({ userId: u!.id, fullName: p.name.trim().slice(0, 100) || "Student", grade: 12, learningStatus: "REGISTERED", subscriptionStatus: "FREE", consentAcceptedAt: new Date() }).returning({ id: studentProfiles.id });
        await tx.insert(studentProgress).values({ studentId: profile!.id });
        await tx.insert(authIdentities).values({ userId: u!.id, provider, providerUserId: pid, email: provider === "google" ? p.email : null });
        return { userId: u!.id, isNew: true };
      });
    } catch (e) {
      if (isUnique(e) && retry) return this.resolve(provider, pid, p, false); // two simultaneous first logins: the loser reuses the winner's rows
      throw e;
    }
  }
}
