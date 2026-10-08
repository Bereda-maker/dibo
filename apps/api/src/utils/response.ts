import type { Context } from "hono";
export const ok = <T>(c: Context, data: T, status: 200 | 201 = 200) => c.json({ success: true as const, data }, status);
