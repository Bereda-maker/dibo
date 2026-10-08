"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { DEMO } from "./config";
export type Profile = { id: string; email: string; fullName: string; phone: string | null; school: string | null; region: string | null; city: string | null; grade: number; stream: string | null; examYear: number | null; displayName: string | null; subjectIds: string[]; learningStatus: string; subscriptionStatus: string; leaderboardOptIn: boolean };
type S = { ready: boolean; role: "STUDENT" | "ADMIN" | "SUPER_ADMIN" | null; profile: Profile | null; refresh: () => Promise<void>; logout: () => Promise<void> };
const C = createContext<S>({ ready: true, role: null, profile: null, refresh: async () => {}, logout: async () => {} });
export const useSession = () => useContext(C);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<{ ready: boolean; role: S["role"]; profile: Profile | null }>({ ready: DEMO, role: null, profile: null });
  const refresh = useCallback(async () => {
    if (DEMO) return;
    try { const me = await api<{ role: S["role"] }>("/auth/me"); const profile = me.role === "STUDENT" ? await api<Profile>("/students/me") : null; setSt({ ready: true, role: me.role, profile }); }
    catch { setSt({ ready: true, role: null, profile: null }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const logout = useCallback(async () => { try { await api("/auth/logout", { method: "POST", body: {} }); } finally { setSt({ ready: true, role: null, profile: null }); } }, []);
  const v = useMemo(() => ({ ...st, refresh, logout }), [st, refresh, logout]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
