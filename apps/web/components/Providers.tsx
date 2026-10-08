"use client";
import { StoreProvider } from "../lib/store";
import { ToastProvider } from "./ui";
export function Providers({ children }: { children: React.ReactNode }) { return <StoreProvider><ToastProvider>{children}</ToastProvider></StoreProvider>; }
