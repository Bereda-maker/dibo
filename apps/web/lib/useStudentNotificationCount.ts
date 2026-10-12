"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";

const REFRESH_EVENT = "dibora:student-unread-notifications-changed";
const REFRESH_INTERVAL_MS = 30_000;

export type StudentNotificationCountState = {
  count: number | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
};

export const StudentNotificationCountContext = createContext<StudentNotificationCountState>({
  count: null,
  loading: false,
  error: false,
  reload: async () => {},
});

export const useStudentNotificationCountContext = () => useContext(StudentNotificationCountContext);

export function notifyStudentUnreadNotificationsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Fetch a signed-in student's exact unread count; never infer a live count from a page-sized list. */
export function useStudentNotificationCount(enabled: boolean): StudentNotificationCountState {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!enabled) {
      setCount(null);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api<{ count: number }>("/notifications/unread-count");
      const nextCount = Number(result.count);
      if (!Number.isSafeInteger(nextCount) || nextCount < 0) throw new Error("Invalid unread notification count");
      if (version === requestVersion.current) {
        setCount(nextCount);
        setError(false);
      }
    } catch {
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      requestVersion.current++;
      setCount(null);
      setLoading(false);
      setError(false);
      return;
    }

    void reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, REFRESH_INTERVAL_MS);
    const onFocus = () => { void reload(); };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void reload(); };
    const onRefresh = () => { void reload(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      requestVersion.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [enabled, reload]);

  return { count, loading, error, reload };
}
