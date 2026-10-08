import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { securityHeaders } from "./middleware/security-headers";
import { authRoutes } from "./routes/auth";
import { paymentRoutes } from "./routes/payments";
import { attemptRoutes } from "./routes/attempts";
import { studentRoutes } from "./routes/student";
import { adminRoutes } from "./routes/admin";
import { requireAdmin } from "./middleware/auth";
import type { StudentService } from "./services/student.service";
import type { PracticeService } from "./services/practice.service";
import type { ProgressService } from "./services/progress.service";
import type { AiChatService } from "./services/ai-chat.service";
import type { LearningService } from "./services/learning.service";
import type { AdminService } from "./services/admin.service";
import { contentRoutes, publicContentRoutes } from "./routes/content";
import { publicPlanRoutes, subscriptionRoutes } from "./routes/subscriptions";
import type { CheckoutService } from "./services/payments/checkout.service";
import type { Db } from "@dibora/database";
import { requireAuth, requireStudent } from "./middleware/auth";
import type { AttemptService } from "./services/attempt.service";
import type { AuthService } from "./services/auth.service";
import type { PaymentService } from "./services/payments/payment.service";

export function createApp(deps: { auth: AuthService; payments: PaymentService; checkout: CheckoutService; db: Db; defaultProvider: string; attempts: AttemptService; students: StudentService; practice: PracticeService; progress: ProgressService; chat: AiChatService; admin: AdminService; learning: LearningService; resolveStudent: (userId: string) => Promise<{ studentId: string; isPremium: boolean } | null>; webOrigin: string; isProd: boolean }) {
  const app = new Hono();
  app.use("*", requestId, securityHeaders, logger());
  app.use("/api/*", cors({ origin: deps.webOrigin, credentials: true, allowMethods: ["GET", "POST", "PATCH", "DELETE"] }));
  // CSRF: cookies are SameSite=Lax + CORS is locked to WEB_ORIGIN; also reject cross-origin state-changing requests.
  app.use("/api/*", async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.req.path.startsWith("/api/payments/webhook")) {
      const origin = c.req.header("origin");
      if (origin && origin !== deps.webOrigin) return c.json({ success: false, error: { code: "CSRF", message: "Cross-origin request blocked" } }, 403);
    }
    await next();
  });
  app.get("/health", (c) => c.json({ success: true, data: { status: "ok" } }));
  app.route("/api/auth", authRoutes(deps.auth, deps.isProd));
  app.route("/api/subscriptions", publicPlanRoutes(deps.checkout));
  app.use("/api/subscriptions/*", async (c, next) => (c.req.path.endsWith("/plans") ? next() : requireAuth(deps.auth)(c, next)));
  app.route("/api/subscriptions", subscriptionRoutes(deps.checkout, deps.payments, deps.defaultProvider));
  app.route("/api/public", publicContentRoutes(deps.db));
  app.use("/api/content/*", requireAuth(deps.auth));
  app.route("/api/content", contentRoutes(deps.db));
  app.use("/api/students/*", requireAuth(deps.auth), requireStudent);
  for (const p of ["practice", "progress", "recommendations", "achievements", "notifications", "ai", "exams", "bookmarks", "leaderboard", "search", "notes", "attempts"]) app.use(`/api/${p}/*`, requireAuth(deps.auth), requireStudent);
  app.route("/api", studentRoutes({ students: deps.students, practice: deps.practice, progress: deps.progress, chat: deps.chat, learning: deps.learning, resolve: deps.resolveStudent }));
  app.use("/api/admin/*", requireAuth(deps.auth), requireAdmin);
  app.route("/api/admin", adminRoutes(deps.admin));
  app.use("/api/attempts/*", requireAuth(deps.auth), requireStudent);
  app.route("/api/attempts", attemptRoutes(deps.attempts, deps.resolveStudent));
  app.route("/api/payments", paymentRoutes(deps.payments));
  // Remaining route modules (students, subjects, topics, notes, questions, practice, exams, attempts,
  // progress, recommendations, achievements, notifications, ai, subscriptions, admin) follow the same pattern.
  app.notFound((c) => c.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
  app.onError(errorHandler);
  return app;
}
