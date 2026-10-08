"use client";
import { useCallback, useEffect, useState } from "react";
/** Minimal data hook: loading, error and retry for every live screen. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<Error | null>(null); const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => { setLoading(true); setError(null); fn().then(setData).catch((e) => setError(e)).finally(() => setLoading(false)); }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
