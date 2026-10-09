import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  WEB_ORIGIN: z.string().url(),
  VERIFY_ET_BASE_URL: z.string().url().default("https://verify.et"), VERIFY_ET_API_KEY: z.string().min(1), VERIFY_ET_WEBHOOK_SECRET: z.string().min(1),
  RECEIPT_STORAGE_DIR: z.string().default("./data/receipts"),
  /** Public receiving accounts shown to students, e.g. [{"method":"telebirr","accountName":"Dibora","accountNumber":"09..."}] */
  PAYMENT_ACCOUNTS: z.string().optional().transform((s, ctx) => { if (!s) return []; try { return z.array(z.object({ method: z.string(), accountName: z.string(), accountNumber: z.string() })).parse(JSON.parse(s)); } catch { ctx.addIssue({ code: "custom", message: "PAYMENT_ACCOUNTS must be a JSON array of {method,accountName,accountNumber}" }); return z.NEVER; } }),
  AI_PROVIDER_API_KEY: z.string().optional(), AI_BASE_URL: z.string().url().optional(), AI_MODEL: z.string().optional(),
});
/** Fail fast at boot with a readable message instead of failing on the first request. */
export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const r = schema.safeParse(env);
  if (!r.success) { console.error("Invalid configuration:\n" + r.error.issues.map((i) => ` - ${i.path.join(".")}: ${i.message}`).join("\n")); process.exit(1); }
  return r.data;
}
