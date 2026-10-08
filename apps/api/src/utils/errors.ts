export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export const Errors = {
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Please sign in to continue"),
  forbidden: () => new AppError(403, "FORBIDDEN", "You do not have access to this resource"),
  notFound: (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`),
  conflict: (msg: string) => new AppError(409, "CONFLICT", msg),
  premiumRequired: (feature: string) => new AppError(402, "PREMIUM_REQUIRED", "This feature requires a Premium plan", { feature }),
  rateLimited: (retryAfter: number) => new AppError(429, "RATE_LIMITED", "Too many requests. Please slow down.", { retryAfter }),
  badRequest: (msg: string, details?: unknown) => new AppError(400, "BAD_REQUEST", msg, details),
};
