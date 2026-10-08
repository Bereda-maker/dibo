import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get("requestId") as string | undefined;
  if (err instanceof ZodError) {
    return c.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request", details: err.flatten().fieldErrors, requestId } }, 400);
  }
  if (err instanceof AppError) {
    return c.json({ success: false, error: { code: err.code, message: err.message, details: err.details, requestId } }, err.status as 400);
  }
  console.error(JSON.stringify({ level: "error", requestId, message: err.message, stack: err.stack })); // logged, never returned
  return c.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId } }, 500);
};
