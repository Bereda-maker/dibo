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
    let registration: ServiceWorkerRegistration | undefined;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((nextRegistration) => {
        registration = nextRegistration;
        // Explicitly check for a refreshed shell so an old offline page is not
        // kept indefinitely by browsers that rarely revisit the app online.
        return nextRegistration.update();
      }).catch(() => undefined);
    };
    const update = () => { if (navigator.onLine) void registration?.update().catch(() => undefined); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    const sync = () => { if (navigator.onLine) void drainOfflineMutations(syncMutation); };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("online", update);
    return () => { window.removeEventListener("load", register); window.removeEventListener("online", sync); window.removeEventListener("online", update); };
  }, []);
  return null;
}
