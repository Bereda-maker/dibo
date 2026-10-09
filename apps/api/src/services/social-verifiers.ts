import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../utils/errors";

const bad = (provider: string) => new AppError(401, "INVALID_SOCIAL_LOGIN", `${provider} sign-in could not be verified`);
const json = (b64: string): Record<string, unknown> | null => { try { const v = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")); return v && typeof v === "object" ? v : null; } catch { return null; } };

export type GoogleIdentity = { sub: string; email: string; name: string };

/** Verifies a Google Identity Services ID token locally: RS256 signature against Google's public keys, issuer, audience, expiry, verified email. */
export class GoogleIdTokenVerifier {
  private cache: { at: number; keys: JsonWebKey[] & { kid?: string }[] } | null = null;
  constructor(private cfg: { clientId: string; fetchImpl?: typeof fetch; now?: () => number; jwksUrl?: string }) {}
  get clientId() { return this.cfg.clientId; }
  private async keys(force = false) {
    const now = (this.cfg.now ?? Date.now)();
    if (!force && this.cache && now - this.cache.at < 3_600_000) return this.cache.keys;
    const res = await (this.cfg.fetchImpl ?? fetch)(this.cfg.jwksUrl ?? "https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    const body = res && res.ok ? ((await res.json().catch(() => null)) as { keys?: JsonWebKey[] } | null) : null;
    if (!body?.keys?.length) throw new AppError(503, "SOCIAL_LOGIN_UNAVAILABLE", "Google sign-in is temporarily unavailable. Please try again.");
    this.cache = { at: now, keys: body.keys as never }; return this.cache.keys;
  }
  async verify(token: string): Promise<GoogleIdentity> {
    const parts = token.split("."); if (parts.length !== 3) throw bad("Google");
    const header = json(parts[0]!); const claims = json(parts[1]!); if (!header || !claims || header.alg !== "RS256" || typeof header.kid !== "string") throw bad("Google");
    let jwk = (await this.keys()).find((k) => (k as { kid?: string }).kid === header.kid);
    if (!jwk) jwk = (await this.keys(true)).find((k) => (k as { kid?: string }).kid === header.kid); // keys rotate: refetch once
    if (!jwk) throw bad("Google");
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]).catch(() => null);
    const okSig = key && (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, Buffer.from(parts[2]!, "base64url"), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)).catch(() => false));
    if (!okSig) throw bad("Google");
    const nowSec = Math.floor((this.cfg.now ?? Date.now)() / 1000);
    const iss = claims.iss, exp = Number(claims.exp), iat = Number(claims.iat);
    if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") throw bad("Google");
    if (claims.aud !== this.cfg.clientId) throw bad("Google");
    if (!Number.isFinite(exp) || exp <= nowSec || (Number.isFinite(iat) && iat > nowSec + 300)) throw bad("Google");
    if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || !claims.email) throw bad("Google");
    if (claims.email_verified !== true && claims.email_verified !== "true") throw new AppError(401, "EMAIL_NOT_VERIFIED", "Your Google email address is not verified");
    return { sub: claims.sub, email: claims.email.trim().toLowerCase(), name: typeof claims.name === "string" ? claims.name : "" };
  }
}

export type TelegramIdentity = { id: string; name: string };

/** Verifies the Telegram Login Widget payload: HMAC-SHA256 keyed with SHA256(bot token) over the sorted "key=value" lines, and a fresh auth_date. */
export function verifyTelegramLogin(data: Record<string, unknown>, botToken: string, nowMs = Date.now()): TelegramIdentity {
  const hash = typeof data.hash === "string" ? data.hash.toLowerCase() : "";
  const check = Object.keys(data).filter((k) => k !== "hash" && data[k] !== undefined && data[k] !== null).sort().map((k) => `${k}=${String(data[k])}`).join("\n");
  const expected = createHmac("sha256", createHash("sha256").update(botToken).digest()).update(check).digest("hex");
  const a = Buffer.from(hash, "utf8"), b = Buffer.from(expected, "utf8");
  if (!hash || a.length !== b.length || !timingSafeEqual(a, b)) throw bad("Telegram");
  const authDate = Number(data.auth_date), nowSec = Math.floor(nowMs / 1000);
  if (!Number.isFinite(authDate) || nowSec - authDate > 86_400 || authDate - nowSec > 300) throw new AppError(401, "STALE_SOCIAL_LOGIN", "Telegram sign-in expired. Please try again.");
  const id = String(data.id ?? ""); if (!/^\d{1,20}$/.test(id)) throw bad("Telegram");
  const name = [data.first_name, data.last_name].filter((x) => typeof x === "string" && x).join(" ") || (typeof data.username === "string" ? data.username : "");
  return { id, name };
}
