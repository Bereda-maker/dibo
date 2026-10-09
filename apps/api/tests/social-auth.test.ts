import { describe, expect, test, beforeAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { createHash, createHmac } from "node:crypto";
import { resolve } from "node:path";
import { Hono } from "hono";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { AuthService } from "../src/services/auth.service";
import { SocialAuthService } from "../src/services/social-auth.service";
import { GoogleIdTokenVerifier, verifyTelegramLogin } from "../src/services/social-verifiers";
import { authRoutes } from "../src/routes/auth";
import { errorHandler } from "../src/middleware/error-handler";

const raw = drizzle(new PGlite(), { schema: s }); const db = raw as unknown as Db;
const CLIENT = "client-123.apps.googleusercontent.com", BOT = "123456:TEST-BOT-TOKEN";
const auth = new AuthService(db);
let priv: CryptoKey, other: CryptoKey, jwks: { keys: unknown[] }; let fetches = 0;
const NOW = () => Date.now();
const b64 = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

beforeAll(async () => {
  await migrate(raw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  const alg = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
  const k = (await crypto.subtle.generateKey(alg, true, ["sign", "verify"])) as CryptoKeyPair; priv = k.privateKey;
  other = ((await crypto.subtle.generateKey(alg, true, ["sign", "verify"])) as CryptoKeyPair).privateKey;
  jwks = { keys: [{ ...(await crypto.subtle.exportKey("jwk", k.publicKey)), kid: "k1", alg: "RS256", use: "sig" }] };
});
const fetchImpl = (async () => { fetches++; return new Response(JSON.stringify(jwks)); }) as unknown as typeof fetch;
const google = new GoogleIdTokenVerifier({ clientId: CLIENT, fetchImpl });
const social = new SocialAuthService(db, auth, { google, telegram: { botToken: BOT, botUsername: "DiboraBot" } });

const idToken = async (over: Record<string, unknown> = {}, key = priv, header: Record<string, unknown> = {}) => {
  const now = Math.floor(NOW() / 1000); const h = b64({ alg: "RS256", kid: "k1", typ: "JWT", ...header }); const p = b64({ iss: "https://accounts.google.com", aud: CLIENT, sub: "g-1", email: "Ana@Example.com", email_verified: true, name: "Ana Bekele", iat: now, exp: now + 3600, ...over });
  const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${h}.${p}`))).toString("base64url"); return `${h}.${p}.${sig}`;
};
const tg = (over: Record<string, unknown> = {}, token = BOT) => {
  const d: Record<string, unknown> = { id: 777001, first_name: "Abel", last_name: "T", username: "abel_t", auth_date: Math.floor(NOW() / 1000), ...over };
  const check = Object.keys(d).sort().map((k) => `${k}=${d[k]}`).join("\n"); d.hash = createHmac("sha256", createHash("sha256").update(token).digest()).update(check).digest("hex"); return d;
};
const count = async (t: typeof s.users | typeof s.authIdentities) => (await raw.select().from(t)).length;

describe("Google sign-in", () => {
  test("new user: creates account + profile + identity + working session; no password login possible", async () => {
    const r = await social.loginWithGoogle(await idToken());
    expect(r.isNew).toBe(true); expect(r.role).toBe("STUDENT"); expect(await auth.validateSession(r.token)).toMatchObject({ role: "STUDENT" });
    const [u] = await raw.select().from(s.users).where(eq(s.users.email, "ana@example.com")); expect(u!.emailVerifiedAt).not.toBeNull();
    const [p] = await raw.select().from(s.studentProfiles).where(eq(s.studentProfiles.userId, u!.id)); expect(p!.fullName).toBe("Ana Bekele"); expect(p!.grade).toBe(12); expect(p!.subscriptionStatus).toBe("FREE");
    expect((await raw.select().from(s.studentProgress)).length).toBe(1);
    await expect(auth.login("ana@example.com", "anything-at-all-123")).rejects.toThrow("Incorrect email or password");
  });
  test("second sign-in reuses the same user and identity (no duplicates)", async () => {
    const before = [await count(s.users), await count(s.authIdentities)]; const r = await social.loginWithGoogle(await idToken());
    expect(r.isNew).toBe(false); expect([await count(s.users), await count(s.authIdentities)]).toEqual(before);
  });
  test("links to an existing email account; an UNVERIFIED password account loses its password and sessions (pre-hijack protection)", async () => {
    const pw = "Password12345"; const [u] = await raw.insert(s.users).values({ email: "victim@example.com", passwordHash: await Bun.password.hash(pw, { algorithm: "argon2id" }) }).returning();
    await raw.insert(s.studentProfiles).values({ userId: u!.id, fullName: "V", grade: 12 }); const attacker = await auth.login("victim@example.com", pw);
    const r = await social.loginWithGoogle(await idToken({ sub: "g-victim", email: "victim@example.com" }));
    expect(r.isNew).toBe(false); expect((await raw.select().from(s.users).where(eq(s.users.email, "victim@example.com"))).length).toBe(1);
    await expect(auth.login("victim@example.com", pw)).rejects.toThrow("Incorrect"); expect(await auth.validateSession(attacker.token)).toBeNull();
    expect(await auth.validateSession(r.token)).toMatchObject({ userId: u!.id });
  });
  test("a verified-email account keeps its password after linking", async () => {
    const pw = "Password12345"; const [u] = await raw.insert(s.users).values({ email: "kept@example.com", passwordHash: await Bun.password.hash(pw, { algorithm: "argon2id" }), emailVerifiedAt: new Date() }).returning();
    await raw.insert(s.studentProfiles).values({ userId: u!.id, fullName: "K", grade: 12 });
    await social.loginWithGoogle(await idToken({ sub: "g-kept", email: "kept@example.com" })); expect((await auth.login("kept@example.com", pw)).role).toBe("STUDENT");
  });
  test("rejects wrong audience, wrong issuer, expired, unverified email, tampered claims, foreign signature, bad kid, alg none, garbage", async () => {
    const now = Math.floor(NOW() / 1000); const t = await idToken({ sub: "g-x", email: "x@example.com" });
    for (const bad of [await idToken({ aud: "other-client" }), await idToken({ iss: "https://evil.example" }), await idToken({ exp: now - 10 }), await idToken({ iat: now + 4000, exp: now + 9000 }), await idToken({ email_verified: false }), await idToken({}, other), await idToken({}, priv, { kid: "nope" }),
      `${t.split(".")[0]}.${b64({ ...JSON.parse(Buffer.from(t.split(".")[1]!, "base64url").toString()), email: "admin@example.com" })}.${t.split(".")[2]}`, `${b64({ alg: "none", kid: "k1" })}.${b64({ aud: CLIENT })}.`, "garbage", ""]) await expect(social.loginWithGoogle(bad.length < 20 ? bad.padEnd(20, "x") : bad)).rejects.toThrow();
    expect((await raw.select().from(s.users).where(eq(s.users.email, "x@example.com"))).length).toBe(0);
  });
  test("a suspended account cannot sign in with Google", async () => {
    await raw.update(s.users).set({ isActive: false }).where(eq(s.users.email, "ana@example.com")); await expect(social.loginWithGoogle(await idToken())).rejects.toThrow("unavailable");
    await raw.update(s.users).set({ isActive: true }).where(eq(s.users.email, "ana@example.com"));
  });
  test("Google public keys are cached between sign-ins", async () => { const n = fetches; await social.loginWithGoogle(await idToken()); await social.loginWithGoogle(await idToken()); expect(fetches).toBe(n); });
});

describe("Telegram sign-in", () => {
  test("valid payload creates a student with a placeholder email and no password", async () => {
    const r = await social.loginWithTelegram(tg()); expect(r.isNew).toBe(true);
    const [u] = await raw.select().from(s.users).where(eq(s.users.email, "tg_777001@telegram.invalid")); expect(u).toBeDefined();
    const [p] = await raw.select().from(s.studentProfiles).where(eq(s.studentProfiles.userId, u!.id)); expect(p!.fullName).toBe("Abel T");
    await expect(auth.login("tg_777001@telegram.invalid", "x")).rejects.toThrow();
  });
  test("repeat sign-in reuses the account", async () => { const n = await count(s.users); expect((await social.loginWithTelegram(tg())).isNew).toBe(false); expect(await count(s.users)).toBe(n); });
  test("rejects forged hash, tampered field, wrong bot token, missing hash", async () => {
    const good = tg(); for (const bad of [{ ...good, hash: "0".repeat(64) }, { ...good, id: 999 }, { ...good, first_name: "Admin" }, tg({}, "999:OTHER"), { ...good, hash: undefined }]) await expect(social.loginWithTelegram(bad as Record<string, unknown>)).rejects.toThrow();
    expect((await raw.select().from(s.users).where(eq(s.users.email, "tg_999@telegram.invalid"))).length).toBe(0);
  });
  test("rejects stale (>24h) and future auth_date; validates id format", () => {
    const old = tg({ auth_date: Math.floor(NOW() / 1000) - 90_000 }); expect(() => verifyTelegramLogin(old, BOT)).toThrow("expired");
    expect(() => verifyTelegramLogin(tg({ auth_date: Math.floor(NOW() / 1000) + 3600 }), BOT)).toThrow("expired");
    expect(() => verifyTelegramLogin(tg({ id: "12abc" }), BOT)).toThrow();
  });
  test("a Telegram account never links to an email account", async () => {
    const before = await count(s.users); await social.loginWithTelegram(tg({ id: 888002, username: "ana" })); expect(await count(s.users)).toBe(before + 1);
  });
});

describe("routes + cookie", () => {
  const mk = (isProd: boolean, sameSite?: "Lax" | "None", withSocial = true) => { const a = new Hono(); a.route("/api/auth", authRoutes(auth, isProd, { social: withSocial ? social : undefined, sameSite })); a.onError(errorHandler); return a; };
  const post = (a: Hono, path: string, body: unknown) => a.request(`/api/auth/${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  test("production cookie is HttpOnly; Secure; SameSite=None so it works between vercel.app and onrender.com", async () => {
    const r = await post(mk(true), "telegram", tg({ id: 555003 })); expect(r.status).toBe(200); const c = r.headers.get("set-cookie")!;
    expect(c).toContain("HttpOnly"); expect(c).toContain("Secure"); expect(c).toMatch(/SameSite=None/i);
  });
  test("dev default is Lax; COOKIE_SAMESITE=Lax override works in production", async () => {
    expect((await post(mk(false), "telegram", tg({ id: 555004 }))).headers.get("set-cookie")).toMatch(/SameSite=Lax/i);
    expect((await post(mk(true, "Lax"), "telegram", tg({ id: 555005 }))).headers.get("set-cookie")).toMatch(/SameSite=Lax/i);
  });
  test("forged requests get 401 and no cookie; google route validates body", async () => {
    const r = await post(mk(true), "telegram", { ...tg(), hash: "a".repeat(64) }); expect(r.status).toBe(401); expect(r.headers.get("set-cookie")).toBeNull();
    expect((await post(mk(true), "google", { credential: "short" })).status).toBe(400);
    expect((await post(mk(true), "google", { credential: "x".repeat(40) })).status).toBe(401);
  });
  test("providers endpoint lists only public values; disabled providers return 404", async () => {
    const p = (await (await mk(true).request("/api/auth/providers")).json()) as { data: unknown }; expect(p.data).toEqual({ google: { clientId: CLIENT }, telegram: { botUsername: "DiboraBot" } });
    expect(JSON.stringify(p)).not.toContain(BOT);
    expect(((await (await mk(true, undefined, false).request("/api/auth/providers")).json()) as { data: unknown }).data).toEqual({ google: null, telegram: null });
    expect((await post(mk(true, undefined, false), "google", { credential: "x".repeat(40) })).status).toBe(404);
  });
});
