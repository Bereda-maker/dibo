"use client";
import { StoreProvider } from "../lib/store";
import { SessionProvider } from "../lib/session";
import { ToastProvider } from "./ui";
import { ContentLocalizer } from "./ContentLocalizer";
export function Providers({ children }: { children: React.ReactNode }) { return <StoreProvider><SessionProvider><ToastProvider><ContentLocalizer />{children}</ToastProvider></SessionProvider></StoreProvider>; }
