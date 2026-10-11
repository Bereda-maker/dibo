"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useT } from "../lib/i18n";

export function NetworkStatus() {
  const t = useT();
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setVisible(!navigator.onLine); };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (!online) return;
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [online]);
  if (!visible) return null;
  return <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg ${online ? "bg-success" : "bg-secondary"}`}><span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">{online ? <Wifi size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}</span>{t(online ? "Back online" : "You are offline")}</div>;
}
