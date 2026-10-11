import { API_URL } from "./config";
import { isOfflineCacheable, isOfflineQueueable, queueOfflineMutation, readOffline, writeOffline } from "./offlineDb";
export class ApiError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); } }
export const OFFLINE_QUEUED = "OFFLINE_QUEUED";
export const isOfflineQueued = (value: unknown): value is { offlineQueued: true } => !!value && typeof value === "object" && (value as { offlineQueued?: boolean }).offlineQueued === true;
export async function publicApi<T>(path: string): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_URL}/api/public${path}`); } catch { throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again."); }
  const json = await res.json().catch(() => null) as { success: boolean; data?: T; error?: { code?: string; message?: string } } | null;
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? "Something went wrong");
  return json.data as T;
}
/** Calls the API with the session cookie and unwraps the { success, data } envelope. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  let res: Response;
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData; // multipart: let the browser set the boundary
  try { res = await fetch(`${API_URL}/api${path}`, { method, credentials: "include", headers: opts.body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined, body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body) }); }
  catch {
    if (method === "GET" && isOfflineCacheable(path)) {
      const cached = await readOffline<T>(path);
      if (cached !== null) return cached;
    }
    if (isOfflineQueueable(path, method) && await queueOfflineMutation(path, method, opts.body)) return { offlineQueued: true } as T;
    throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null) as { success: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? "Something went wrong", json?.error?.details);
  if (method === "GET" && isOfflineCacheable(path)) void writeOffline(path, json.data);
  return json.data as T;
}
export const fieldErrors = (e: unknown): Record<string, string> => {
  if (e instanceof ApiError && e.code === "VALIDATION_ERROR" && e.details && typeof e.details === "object") return Object.fromEntries(Object.entries(e.details as Record<string, string[]>).map(([k, v]) => [k, v[0] ?? "Invalid"]));
  return {};
};
