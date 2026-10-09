import { Hono } from "hono";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { v as zValidator } from "../utils/validate";
import { registerSchema, loginSchema } from "@dibora/validation";
import type { AuthService } from "../services/auth.service";
import type { SocialAuthService } from "../services/social-auth.service";
import { rateLimit } from "../middleware/rate-limit";
import { ok } from "../utils/response";
import { requireAuth, type AuthContext } from "../middleware/auth";

type SameSite = "Lax" | "None" | "Strict";
/** In production the site (e.g. vercel.app) and the API (e.g. onrender.com) are different sites, so the session cookie must be SameSite=None; Secure.
 *  When both share one registrable domain (app.example.com + api.example.com) set COOKIE_SAMESITE=Lax. */
export const authRoutes = (auth: AuthService, isProd: boolean, opts: { social?: SocialAuthService; sameSite?: SameSite } = {}) => {
  const r = new Hono();
  const sameSite: SameSite = opts.sameSite ?? (isProd ? "None" : "Lax");
  const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: isProd || sameSite === "None", sameSite, path: "/", maxAge });

  r.post("/register", rateLimit({ limit: 5, windowMs: 60_000, prefix: "reg" }), zValidator("json", registerSchema), async (c) => {
    const res = await auth.register(c.req.valid("json"));
    return ok(c, { studentId: res.studentId, next: "COMPLETE_PROFILE" }, 201);
  });

  r.post("/login", rateLimit({ limit: 10, windowMs: 60_000, prefix: "login" }), zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const s = await auth.login(email, password);
    setCookie(c, "session", s.token, cookieOpts(s.maxAgeSeconds));
    return ok(c, { role: s.role });
  });

  const social = opts.social;
  const socialLimit = rateLimit({ limit: 10, windowMs: 60_000, prefix: "social" });
  r.get("/providers", (c) => ok(c, social ? social.providers() : { google: null, telegram: null }));
  r.post("/google", socialLimit, zValidator("json", z.object({ credential: z.string().min(20).max(4096) })), async (c) => {
    if (!social) return c.json({ success: false, error: { code: "NOT_FOUND", message: "Google sign-in is not enabled" } }, 404);
    const s = await social.loginWithGoogle(c.req.valid("json").credential);
    setCookie(c, "session", s.token, cookieOpts(s.maxAgeSeconds));
    return ok(c, { role: s.role, isNew: s.isNew });
  });
  r.post("/telegram", socialLimit, zValidator("json", z.object({ id: z.union([z.number(), z.string()]), hash: z.string().min(32).max(128), auth_date: z.union([z.number(), z.string()]) }).passthrough()), async (c) => {
    if (!social) return c.json({ success: false, error: { code: "NOT_FOUND", message: "Telegram sign-in is not enabled" } }, 404);
    const s = await social.loginWithTelegram(c.req.valid("json"));
    setCookie(c, "session", s.token, cookieOpts(s.maxAgeSeconds));
    return ok(c, { role: s.role, isNew: s.isNew });
  });

  r.post("/logout", async (c) => {
    const t = getCookie(c, "session");
    if (t) await auth.logout(t);
    deleteCookie(c, "session", { path: "/" });
    return ok(c, { loggedOut: true });
  });
  r.get("/me", requireAuth(auth), async (c) => { const a = (c as unknown as { get: (k: string) => unknown }).get("auth") as AuthContext; return ok(c, { userId: a.userId, role: a.role }); });
  return r;
};
