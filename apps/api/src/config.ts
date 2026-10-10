import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  WEB_ORIGIN: z.string().url(),
  VERIFY_ET_BASE_URL: z.string().url().default("https://verify.et"), VERIFY_ET_API_KEY: z.string().min(1), VERIFY_ET_WEBHOOK_SECRET: z.string().min(1),
  /** Optional social login. Empty values count as "not configured". */
  GOOGLE_CLIENT_ID: z.string().optional().transform((v) => v?.trim() || undefined),
  TELEGRAM_BOT_TOKEN: z.string().optional().transform((v) => v?.trim() || undefined),
  TELEGRAM_BOT_USERNAME: z.string().optional().transform((v) => v?.trim().replace(/^@/, "") || undefined),
  COOKIE_SAMESITE: z.enum(["Lax", "None", "Strict"]).optional().or(z.literal("").transform(() => undefined)),
  RECEIPT_STORAGE_DIR: z.string().default("./data/receipts"),
  /** Public receiving accounts shown to students, e.g. [{"method":"telebirr","accountName":"Dibora","accountNumber":"09..."}] */
  PAYMENT_ACCOUNTS: z.string().optional().transform((s, ctx) => { if (!s) return []; try { return z.array(z.object({ method: z.string(), accountName: z.string(), accountNumber: z.string() })).parse(JSON.parse(s)); } catch { ctx.addIssue({ code: "custom", message: "PAYMENT_ACCOUNTS must be a JSON array of {method,accountName,accountNumber}" }); return z.NEVER; } }),
  AI_PROVIDER_API_KEY: z.string().optional().transform((v) => v?.trim() || undefined),
  AI_BASE_URL: z.preprocess((v) => typeof v === "string" && !v.trim() ? undefined : v, z.string().url().default("https://api.openai.com/v1")),
  AI_MODEL: z.preprocess((v) => typeof v === "string" && !v.trim() ? undefined : v, z.string().trim().min(1).default("gpt-6-luna")),
});
/** Fail fast at boot with a readable message instead of failing on the first request. */
export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const r = schema.safeParse(env);
  if (!r.success) { console.error("Invalid configuration:\n" + r.error.issues.map((i) => ` - ${i.path.join(".")}: ${i.message}`).join("\n")); process.exit(1); }
  return r.data;
}
