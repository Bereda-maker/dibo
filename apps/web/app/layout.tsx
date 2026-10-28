import "../styles/globals.css";
import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "../components/Providers";
import { NavigationProgress } from "../components/NavigationProgress";
import { PageTransition } from "../components/PageTransition";
import { ChunkLoadRecovery } from "../components/ChunkLoadRecovery";
import { PwaRegister } from "../components/PwaRegister";
import { NetworkStatus } from "../components/NetworkStatus";
import { MetaPixel } from "../components/MetaPixel";
export const metadata: Metadata = { title: { default: "Deborah — Grade 12 learning & exam preparation", template: "%s · Deborah" }, description: "AI-powered learning, practice and exam preparation built for Ethiopian students.", manifest: "/manifest.webmanifest", icons: { icon: "/favicon.ico", apple: "/icon.png" }, appleWebApp: { capable: true, statusBarStyle: "default", title: "Deborah" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" suppressHydrationWarning><body><a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to content</a><MetaPixel /><Providers><PwaRegister /><NetworkStatus /><ChunkLoadRecovery /><NavigationProgress /><main id="main"><PageTransition>{children}</PageTransition></main></Providers></body></html>);
}
