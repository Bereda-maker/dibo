import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { Role } from "@dibora/types";
import { Errors } from "../utils/errors";
import type { AuthService } from "../services/auth.service";

export type AuthContext = { userId: string; role: Role; sessionId: string };

/** Role always comes from the DB session lookup, never from client-supplied data. */
export const requireAuth = (auth: AuthService): MiddlewareHandler => async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) throw Errors.unauthorized();
  const session = await auth.validateSession(token);
  if (!session) throw Errors.unauthorized();
  c.set("auth", session satisfies AuthContext);
  await next();
};

export const requireRole = (...roles: Role[]): MiddlewareHandler => async (c, next) => {
  const a = c.get("auth") as AuthContext | undefined;
  if (!a) throw Errors.unauthorized();
  if (!roles.includes(a.role)) throw Errors.forbidden();
  await next();
};
export const requireStudent = requireRole("STUDENT");
export const requireAdmin = requireRole("ADMIN", "SUPER_ADMIN");
export const requireSuperAdmin = requireRole("SUPER_ADMIN");
