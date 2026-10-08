"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, BookOpen, Dumbbell, ClipboardCheck, Bot, TrendingUp, Menu, Bookmark, XCircle, Search, Trophy, Medal, Bell, UserCircle, LogOut, Crown } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle, LocaleSwitch } from "./Controls";
import { Skeleton, cx } from "./ui";
import { useStore } from "../lib/store";
import { useT } from "../lib/i18n";

const main = [["/dashboard", "dashboard", LayoutDashboard], ["/notes", "notes", BookOpen], ["/practice", "practice", Dumbbell], ["/exams", "exams", ClipboardCheck], ["/assistant", "assistant", Bot], ["/progress", "progress", TrendingUp]] as const;
const extra = [["/bookmarks", "My Bookmarks", Bookmark], ["/mistakes", "Questions I Got Wrong", XCircle], ["/search", "Search", Search], ["/achievements", "Achievements", Medal], ["/leaderboard", "Leaderboard", Trophy], ["/notifications", "Notifications", Bell], ["/profile", "Profile", UserCircle], ["/pricing", "Plans", Crown]] as const;

export function AppShell({ children, admin = false, items }: { children: React.ReactNode; admin?: boolean; items?: readonly (readonly [string, string])[] }) {
  const { state, ready, logout } = useStore(); const path = usePathname(); const router = useRouter(); const t = useT();
  const u = state.user;
  useEffect(() => { if (ready && (!u || (admin && u.role !== "ADMIN"))) router.replace("/login"); }, [ready, u, admin, router]);
  if (!ready || !u || (admin && u.role !== "ADMIN")) return <div className="p-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  const unread = 3 - state.readNotifs.length;
  const nav = admin ? (items ?? []).map(([h, l]) => ({ h, l, I: null as null })) : [...main.map(([h, k, I]) => ({ h, l: t(k), I })), ...extra.map(([h, l, I]) => ({ h, l, I }))];
  return (<div className="min-h-screen md:flex">
    <aside aria-label="Sidebar" className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 md:block md:sticky md:top-0 md:h-screen md:overflow-y-auto">
      <Logo />{admin && <p className="mt-1 text-xs font-semibold text-accent">ADMIN</p>}
      <nav className="mt-6 space-y-1">{nav.map(({ h, l, I }) => <Link key={h} href={h} aria-current={path === h ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", path === h || (h !== "/admin" && path.startsWith(h + "/")) ? "bg-primary text-white" : "hover:bg-border/50")}>{I && <I size={18} aria-hidden />}{l}{h === "/notifications" && unread > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs text-black">{unread}</span>}</Link>)}</nav>
      <button onClick={() => { logout(); router.push("/"); }} className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-border/50"><LogOut size={18} aria-hidden />Log out</button></aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-2 backdrop-blur"><div className="md:hidden"><Logo /></div><p className="hidden text-sm text-muted md:block">{u.name}</p>
        <div className="flex items-center gap-1"><LocaleSwitch /><ThemeToggle /></div></header>
      <div className="mx-auto max-w-5xl p-4 pb-28 md:p-8">{children}</div></div>
    {!admin && <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface md:hidden">
      {[...main.slice(0, 4), ["/more", "more", Menu] as const].map(([h, k, I]) => <Link key={h} href={h} aria-current={path === h ? "page" : undefined} className={cx("flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px]", path === h ? "font-bold text-primary" : "text-muted")}><I size={20} aria-hidden />{t(k)}</Link>)}</nav>}
    {admin && <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-surface md:hidden">{nav.map(({ h, l }) => <Link key={h} href={h} className={cx("whitespace-nowrap px-4 py-4 text-sm", path === h ? "font-bold text-primary" : "text-muted")}>{l}</Link>)}</nav>}
  </div>);
}
