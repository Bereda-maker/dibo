import { createHmac, timingSafeEqual } from "node:crypto";
export const hmacSha256Hex = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("hex");
export function timingSafeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8"), y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
