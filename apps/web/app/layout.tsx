import "../styles/globals.css";
import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "../components/Providers";
import { NavigationProgress } from "../components/NavigationProgress";
import { PageTransition } from "../components/PageTransition";
import { ChunkLoadRecovery } from "../components/ChunkLoadRecovery";
import { PwaRegister } from "../components/PwaRegister";
import { NetworkStatus } from "../components/NetworkStatus";
export const metadata: Metadata = { title: { default: "Dibora — Grade 12 learning & exam preparation", template: "%s · Dibora" }, description: "AI-powered learning, practice and exam preparation built for Ethiopian students.", manifest: "/manifest.webmanifest", icons: { icon: "/favicon.ico", apple: "/icon.png" }, appleWebApp: { capable: true, statusBarStyle: "default", title: "Dibora" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" suppressHydrationWarning><body><a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to content</a><Providers><PwaRegister /><NetworkStatus /><ChunkLoadRecovery /><NavigationProgress /><main id="main"><PageTransition>{children}</PageTransition></main></Providers></body></html>);
}
