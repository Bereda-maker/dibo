import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Errors } from "../../utils/errors";

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
export type ReceiptMime = "image/jpeg" | "image/png" | "image/webp";

/** Backend validation by size AND magic bytes; the client-declared type/extension is never trusted. */
export function validateReceipt(bytes: Uint8Array): { mime: ReceiptMime; ext: "jpg" | "png" | "webp" } {
  if (bytes.length === 0) throw Errors.badRequest("Receipt image is required");
  if (bytes.length > MAX_RECEIPT_BYTES) throw Errors.badRequest("Receipt image must be 8 MB or smaller");
  const at = (i: number) => bytes[i];
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)) return { mime: "image/png", ext: "png" };
  if (bytes.length > 12 && String.fromCharCode(at(0)!, at(1)!, at(2)!, at(3)!) === "RIFF" && String.fromCharCode(at(8)!, at(9)!, at(10)!, at(11)!) === "WEBP") return { mime: "image/webp", ext: "webp" };
  throw Errors.badRequest("Receipt must be a JPEG, PNG or WebP image");
}

/** Private receipt storage. Receipts hold financial data: no public URL is ever produced. */
export interface ReceiptStorage { put(key: string, bytes: Uint8Array): Promise<string>; get(key: string): Promise<Uint8Array | null>; }

export class LocalReceiptStorage implements ReceiptStorage {
  private root: string;
  constructor(dir: string) { this.root = resolve(dir); }
  private path(key: string) { const p = resolve(join(this.root, key)); if (!p.startsWith(this.root + "/")) throw new Error("Invalid storage key"); return p; }
  async put(key: string, bytes: Uint8Array) { const p = this.path(key); await mkdir(dirname(p), { recursive: true, mode: 0o700 }); await writeFile(p, bytes, { mode: 0o600 }); return key; }
  async get(key: string) { try { return new Uint8Array(await readFile(this.path(key))); } catch { return null; } }
}
