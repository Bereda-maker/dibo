import { AppError } from "../../utils/errors";

const INJECTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above) (instructions|prompts)/i,
  /disregard (the )?(system|previous) (prompt|instructions)/i,
  /reveal (your |the )?(system )?(prompt|instructions|api key)/i,
  /you are now (dan|an? unrestricted)/i,
  /\bjailbreak\b/i,
];
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u202A-\u202E]/g;

export function sanitizeUserInput(raw: string, maxLen = 2000): string {
  const cleaned = raw.replace(CONTROL_CHARS, "").trim().slice(0, maxLen);
  if (!cleaned) throw new AppError(400, "EMPTY_MESSAGE", "Please enter a message");
  return cleaned;
}
export const looksLikeInjection = (s: string) => INJECTION_PATTERNS.some((p) => p.test(s));

/** Strip anything that could leak secrets or markup from model output before it reaches the client. */
export function sanitizeModelOutput(s: string, secrets: string[] = []): string {
  let out = s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  for (const sec of secrets) if (sec && sec.length > 6) out = out.split(sec).join("[redacted]");
  return out.slice(0, 6000);
}
