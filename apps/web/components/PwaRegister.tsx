"use client";

import { useEffect } from "react";
import { API_PREFIX } from "../lib/config";
import { drainOfflineMutations, type OfflineMutation } from "../lib/offlineDb";

async function syncMutation(mutation: OfflineMutation) {
  const response = await fetch(`${API_PREFIX}${mutation.path}`, { method: mutation.method, credentials: "include", headers: { "Content-Type": "application/json" }, body: mutation.body === undefined ? undefined : JSON.stringify(mutation.body) });
  if (!response.ok) throw new Error("Offline sync is still unavailable");
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    const sync = () => { if (navigator.onLine) void drainOfflineMutations(syncMutation); };
    sync();
    window.addEventListener("online", sync);
    return () => { window.removeEventListener("load", register); window.removeEventListener("online", sync); };
  }, []);
  return null;
}
