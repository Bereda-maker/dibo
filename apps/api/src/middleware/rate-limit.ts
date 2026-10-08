import type { MiddlewareHandler } from "hono";
import { Errors } from "../utils/errors";

/** Storage abstraction: swap the in-memory store for Redis in multi-instance deployments. */
export interface RateLimitStore { hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>; }

export class MemoryRateLimitStore implements RateLimitStore {
  private m = new Map<string, { count: number; reset: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const e = this.m.get(key);
    if (!e || e.reset <= now) { this.m.set(key, { count: 1, reset: now + windowMs }); return { count: 1, resetMs: windowMs }; }
    e.count++;
    return { count: e.count, resetMs: e.reset - now };
  }
}

export function rateLimit(opts: { limit: number; windowMs: number; prefix: string; store?: RateLimitStore; keyBy?: "ip" | "user" }): MiddlewareHandler {
  const store = opts.store ?? new MemoryRateLimitStore();
  return async (c, next) => {
    const user = c.get("auth") as { userId: string } | undefined;
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const id = opts.keyBy === "user" && user ? user.userId : ip;
    const { count, resetMs } = await store.hit(`${opts.prefix}:${id}`, opts.windowMs);
    if (count > opts.limit) throw Errors.rateLimited(Math.ceil(resetMs / 1000));
    await next();
  };
}
