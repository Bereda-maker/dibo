"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "dibora_chunk_recovery";

function isChunkFailure(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const recover = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = "reason" in event ? event.reason : event.error ?? event.message;
      if (!isChunkFailure(error)) return;
      if (sessionStorage.getItem(RECOVERY_KEY)) return;
      sessionStorage.setItem(RECOVERY_KEY, "1");
      const url = new URL(window.location.href);
      url.searchParams.set("__chunk_recovery", Date.now().toString());
      window.location.replace(url.toString());
    };
    window.addEventListener("error", recover);
    window.addEventListener("unhandledrejection", recover);
    return () => {
      window.removeEventListener("error", recover);
      window.removeEventListener("unhandledrejection", recover);
    };
  }, []);
  return null;
}
