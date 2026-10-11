"use client";
import Link from "next/link";
import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "../lib/i18n";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export function Card({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cx("min-w-0 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5", className)}>{children}</div>; }
type BtnProps = { href?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;
export function Button({ href, variant = "primary", loading, className, children, ...p }: BtnProps) {
  const c = cx("inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-primary text-white hover:bg-primary-light", variant === "secondary" && "border border-border bg-surface hover:bg-border/40",
    variant === "ghost" && "hover:bg-border/40", variant === "danger" && "bg-error text-white", className);
  if (href) return <Link href={href} className={c}>{children}</Link>;
  return <button className={c} disabled={loading || p.disabled} {...p}>{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}</button>;
}
export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "warning" | "error" | "info" | "accent" }) {
  const t = { muted: "bg-border/60 text-muted", success: "bg-success/15 text-success", warning: "bg-warning/15 text-warning", error: "bg-error/15 text-error", info: "bg-info/15 text-info", accent: "bg-accent/20 text-warning" }[tone];
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}
export function Progress({ value, label, tone = "primary" }: { value: number; label?: string; tone?: "primary" | "warning" | "error" }) {
  const v = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full rounded-full bg-border"><div className={cx("h-2 rounded-full", tone === "primary" ? "bg-primary" : tone === "warning" ? "bg-warning" : "bg-error")} style={{ width: `${v}%` }} /></div>;
}
export const toneFor = (v: number | null) => (v == null ? "primary" : v < 50 ? "error" : v < 70 ? "warning" : "primary") as "primary" | "warning" | "error";
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  const t = useT();
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div className="min-w-0"><h1 className="text-balance text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-tight tracking-tight">{t(title)}</h1>{sub && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t(sub)}</p>}</div>{action}</div>;
}
export function Skeleton({ className }: { className?: string }) { return <div aria-hidden className={cx("skeleton-shimmer rounded-xl bg-[#dedede] dark:bg-border/70", className)} />; }
function SkeletonMediaCard() {
  return <div className="space-y-3"><Skeleton className="aspect-video w-full rounded-xl" /><div className="flex items-start gap-3"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-3/5" /></div></div></div>;
}
export function PageSkeleton({ variant = "app" }: { variant?: "app" | "marketing" | "admin" | "generic" }) {
  if (variant === "marketing") return <main aria-busy="true" aria-label="Loading page" className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><Skeleton className="h-8 w-40" /><section className="grid gap-8 lg:grid-cols-2 lg:items-center"><div className="space-y-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-14 w-full max-w-xl" /><Skeleton className="h-5 w-5/6 max-w-lg" /><Skeleton className="h-12 w-36" /></div><Skeleton className="h-64 w-full rounded-[1.5rem]" /></section><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></main>;
  if (variant === "admin") return <div aria-busy="true" aria-label="Loading page" className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-11 w-32" /></div><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-12 w-full" /><Skeleton className="h-80 w-full" /></div>;
  return <div aria-busy="true" aria-label="Loading page" className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div><div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"><SkeletonMediaCard /><SkeletonMediaCard /><SkeletonMediaCard /><SkeletonMediaCard /><SkeletonMediaCard /><SkeletonMediaCard /></div></div>;
}
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return <div className="rounded-card border border-dashed border-border p-8 text-center"><p className="font-semibold">{title}</p>{body && <p className="mt-1 text-sm text-muted">{body}</p>}{action && <div className="mt-4 flex justify-center">{action}</div>}</div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-card border border-error/40 bg-error/10 p-6 text-center"><p className="font-semibold text-error">{message}</p>{onRetry && <Button className="mt-3" variant="secondary" onClick={onRetry}>Try again</Button>}</div>;
}
export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: (id: string, props: { "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div><label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>{children(id, { "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : undefined })}{hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}{error && <p id={`${id}-err`} className="mt-1 text-xs text-error">{error}</p>}</div>;
}
export const inputCls = "min-h-[44px] w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 aria-[invalid=true]:border-error";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button,a,input")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-card bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-lg font-bold">{title}</h2><div className="mt-3">{children}</div></div></div>;
}

type Toast = { id: number; text: string; tone: "success" | "error" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random(); setItems((i) => [...i, { id, text, tone }]);
    setTimeout(() => setItems((i) => i.filter((t) => t.id !== id)), 4000);
  }, []);
  return <ToastCtx.Provider value={push}>{children}
    <div aria-live="polite" className="fixed bottom-20 right-4 z-[60] space-y-2 md:bottom-4">{items.map((t) => <div key={t.id} className={cx("rounded-xl px-4 py-3 text-sm font-medium text-white shadow-card", t.tone === "success" ? "bg-success" : t.tone === "error" ? "bg-error" : "bg-info")}>{t.text}</div>)}</div></ToastCtx.Provider>;
}
