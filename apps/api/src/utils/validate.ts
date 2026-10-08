import { zValidator } from "@hono/zod-validator";
import type { ZodSchema } from "zod";
/** Wraps zValidator so failures go through the central error handler and use the standard { success:false, error:{ code:"VALIDATION_ERROR", details } } envelope. */
export const v = <T extends ZodSchema>(target: "json" | "query" | "param", schema: T) => zValidator(target, schema, (r) => { if (!r.success) throw r.error; });
