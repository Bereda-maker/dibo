import { API_URL } from "./config";
export class ApiError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); } }
/** Calls the API with the session cookie and unwraps the { success, data } envelope. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_URL}/api${path}`, { method: opts.method ?? "GET", credentials: "include", headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }); }
  catch { throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again."); }
  const json = await res.json().catch(() => null) as { success: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? "Something went wrong", json?.error?.details);
  return json.data as T;
}
export const fieldErrors = (e: unknown): Record<string, string> => {
  if (e instanceof ApiError && e.code === "VALIDATION_ERROR" && e.details && typeof e.details === "object") return Object.fromEntries(Object.entries(e.details as Record<string, string[]>).map(([k, v]) => [k, v[0] ?? "Invalid"]));
  return {};
};
