"use client";
import { StoreProvider } from "../lib/store";
import { SessionProvider } from "../lib/session";
import { ToastProvider } from "./ui";
export function Providers({ children }: { children: React.ReactNode }) { return <StoreProvider><SessionProvider><ToastProvider>{children}</ToastProvider></SessionProvider></StoreProvider>; }
