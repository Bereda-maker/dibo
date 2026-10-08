import type { MiddlewareHandler } from "hono";
export const requestId: MiddlewareHandler = async (c, next) => {
  const rid = crypto.randomUUID();
  c.set("requestId", rid);
  c.header("X-Request-Id", rid);
  await next();
};
