"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

export type AdminActionCounts = {
  pendingPaymentReviews: number;
  unresolvedContacts: number;
  draftCurriculumItems: number;
  draftQuestions: number;
  draftExams: number;
  draftDiagnostics: number;
};

const REFRESH_EVENT = "dibora:admin-action-counts-refresh";
const REFRESH_INTERVAL_MS = 30_000;
export type AdminActionCountsState = { counts: AdminActionCounts | null; loading: boolean; error: boolean; reload: () => Promise<void> };
export const AdminActionCountsContext = createContext<AdminActionCountsState>({ counts: null, loading: false, error: false, reload: async () => {} });
export const useAdminActionCountsContext = () => useContext(AdminActionCountsContext);

/** Notify the shared admin shell after a review/publish action so counts refresh immediately. */
export function notifyAdminActionCountsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useAdminActionCounts(enabled: boolean) {
  const [counts, setCounts] = useState<AdminActionCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setCounts(null);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    try {
      setCounts(await api<AdminActionCounts>("/admin/action-counts"));
      setError(false);
    } catch {
      // Preserve the last verified count snapshot; never replace it with fabricated zeroes.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      setError(false);
      return;
    }
    void reload();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void reload(); }, REFRESH_INTERVAL_MS);
    const onFocus = () => { void reload(); };
    const onRefresh = () => { void reload(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [enabled, reload]);

  return { counts, loading, error, reload };
}
