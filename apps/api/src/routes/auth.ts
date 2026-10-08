import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { v as zValidator } from "../utils/validate";
import { registerSchema, loginSchema } from "@dibora/validation";
import type { AuthService } from "../services/auth.service";
import { rateLimit } from "../middleware/rate-limit";
import { ok } from "../utils/response";
import { requireAuth, type AuthContext } from "../middleware/auth";

export const authRoutes = (auth: AuthService, isProd: boolean) => {
  const r = new Hono();
  const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: isProd, sameSite: "Lax" as const, path: "/", maxAge });

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

  r.post("/logout", async (c) => {
    const t = getCookie(c, "session");
    if (t) await auth.logout(t);
    deleteCookie(c, "session", { path: "/" });
    return ok(c, { loggedOut: true });
  });
  r.get("/me", requireAuth(auth), async (c) => { const a = (c as unknown as { get: (k: string) => unknown }).get("auth") as AuthContext; return ok(c, { userId: a.userId, role: a.role }); });
  return r;
};
