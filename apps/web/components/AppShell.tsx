"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, Bell, BookOpen, Bot, Bookmark, ChevronLeft, ChevronRight,
  ClipboardCheck, Crown, FileQuestion, GraduationCap, LayoutDashboard, LogOut,
  Menu, MessageSquare, Search, Settings, ShieldCheck, Users,
  X, XCircle, Dumbbell, TrendingUp, Trophy, Medal, UserCircle,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle, LocaleSwitch } from "./Controls";
import { Skeleton, cx } from "./ui";
import { useStore } from "../lib/store";
import { useT } from "../lib/i18n";
import { useSession } from "../lib/session";
import { DEMO } from "../lib/config";
import { AdminActionCountsContext, useAdminActionCounts, type AdminActionCounts } from "../lib/useAdminActionCounts";
import { StudentNotificationCountContext, useStudentNotificationCount, type StudentNotificationCountState } from "../lib/useStudentNotificationCount";
import { demoUnreadNotificationCount } from "../lib/studentNotifications";

const main = [["/dashboard", "dashboard", LayoutDashboard], ["/notes", "notes", BookOpen], ["/practice", "practice", Dumbbell], ["/exams", "exams", ClipboardCheck], ["/assistant", "assistant", Bot], ["/progress", "progress", TrendingUp]] as const;
const extra = [["/bookmarks", "My Bookmarks", Bookmark], ["/mistakes", "Questions I Got Wrong", XCircle], ["/search", "Search", Search], ["/achievements", "Achievements", Medal], ["/leaderboard", "Leaderboard", Trophy], ["/notifications", "Notifications", Bell], ["/profile", "Profile", UserCircle], ["/pricing", "Plans", Crown]] as const;
type AdminRouteItem = readonly [string, string, typeof LayoutDashboard];
type AdminRouteGroup = { label: string; items: readonly AdminRouteItem[] };
const adminGroups: readonly AdminRouteGroup[] = [
  { label: "OVERVIEW", items: [["/admin", "Dashboard", LayoutDashboard]] },
  { label: "ACADEMIC MANAGEMENT", items: [["/admin/students", "Students", Users], ["/admin/content", "Subjects & learning materials", BookOpen], ["/admin/questions", "Question bank", FileQuestion], ["/admin/exams", "Exams & results", GraduationCap], ["/admin/diagnostics", "Diagnostic builder", ClipboardCheck]] },
  { label: "INTELLIGENCE", items: [["/admin/ai", "AI management", Bot], ["/admin/analytics", "Analytics", BarChart3]] },
  { label: "BUSINESS", items: [["/admin/subscriptions", "Subscriptions & payments", Crown], ["/admin/contact", "Contact inbox", MessageSquare], ["/admin/notifications", "Notifications", Bell]] },
  { label: "SYSTEM", items: [["/admin/audit", "Audit logs", ShieldCheck], ["/admin/settings", "Settings", Settings]] },
] as const;

function actionBadge(href: string, counts: AdminActionCounts | null) {
  if (!counts) return null;
  if (href === "/admin/subscriptions") return { count: counts.pendingPaymentReviews, label: "manual payment reviews awaiting action" };
  if (href === "/admin/contact") return { count: counts.unresolvedContacts, label: "unresolved contact requests" };
  if (href === "/admin/content") return { count: counts.draftCurriculumItems, label: "draft curriculum items awaiting review" };
  if (href === "/admin/questions") return { count: counts.draftQuestions, label: "draft questions awaiting review" };
  if (href === "/admin/exams") return { count: counts.draftExams, label: "draft exams awaiting review" };
  if (href === "/admin/diagnostics") return { count: counts.draftDiagnostics, label: "draft diagnostics awaiting review" };
  return null;
}

function pendingHref(href: string, counts: AdminActionCounts | null) {
  const badge = actionBadge(href, counts);
  if (!badge?.count) return href;
  if (href === "/admin/contact") return `${href}?status=OPEN`;
  return `${href}?status=DRAFT`;
}

function AdminNavigation({ collapsed, onNavigate, query = "", counts = null, countsLoading = false, countsError = false, onRetry }: { collapsed?: boolean; onNavigate?: () => void; query?: string; counts?: AdminActionCounts | null; countsLoading?: boolean; countsError?: boolean; onRetry?: () => void }) {
  const path = usePathname();
  const normalized = query.trim().toLowerCase();
  return <nav aria-label="Admin console navigation" className="space-y-5">
    {adminGroups.map((group) => {
      const items = group.items.filter(([, label]) => !normalized || label.toLowerCase().includes(normalized));
      if (!items.length) return null;
      return <section key={group.label}>
        {!collapsed && <h2 className="mb-2 px-3 text-[10px] font-bold tracking-[.14em] text-muted">{group.label}</h2>}
        <div className="space-y-1">{items.map(([href, label, Icon]) => {
          const active = href === "/admin" ? path === href : path === href || path.startsWith(href + "/");
          const badge = actionBadge(href, counts); const showBadge = !!badge && badge.count > 0;
          const hrefForAction = pendingHref(href, counts);
          return <Link key={href} href={hrefForAction} title={collapsed ? `${label}${showBadge ? ` — ${badge.count} ${badge.label}` : ""}` : undefined} aria-label={showBadge ? `${label}, ${badge.count} ${badge.label}` : label} aria-current={active ? "page" : undefined} onClick={onNavigate}
            className={cx("group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", active ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-primary/5 hover:text-text", collapsed && "justify-center px-2")}>
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />{!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
            {showBadge && <span aria-hidden="true" className={cx("inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-warning", collapsed && "absolute -right-0.5 -top-1 min-w-4 px-1 text-[9px] ring-2 ring-surface")}>{badge.count.toLocaleString()}</span>}
          </Link>;
        })}</div>
      </section>;
    })}
    {!collapsed && countsLoading && !counts && <p role="status" className="px-3 text-xs text-muted">Loading review counts…</p>}
    {!collapsed && countsError && <p role="status" className="mx-1 rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs text-muted">Review counts may be out of date. <button type="button" className="ml-1 font-semibold text-primary underline" onClick={onRetry}>Retry</button></p>}
  </nav>;
}

function StudentNotificationCountStatus({ state }: { state: StudentNotificationCountState }) {
  if (state.error) return <p role="status" className="mx-1 rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs text-muted">Unread notification count is unavailable. <button type="button" className="ml-1 font-semibold text-primary underline" onClick={() => void state.reload()}>Retry</button></p>;
  if (state.loading && state.count === null) return <p role="status" className="px-3 text-xs text-muted">Checking unread notifications…</p>;
  return null;
}

export function AppShell({ children, admin = false, items }: { children: React.ReactNode; admin?: boolean; items?: readonly (readonly [string, string])[] }) {
  const { state, ready: demoReady, logout: demoLogout } = useStore(); const sess = useSession(); const path = usePathname(); const router = useRouter(); const t = useT();
  const [collapsed, setCollapsed] = useState(false); const [drawerOpen, setDrawerOpen] = useState(false); const [navSearch, setNavSearch] = useState("");
  const ready = DEMO ? demoReady : sess.ready;
  const role = DEMO ? state.user?.role ?? null : sess.role;
  const adminCounts = useAdminActionCounts(admin && !DEMO && (role === "ADMIN" || role === "SUPER_ADMIN"));
  const liveNotificationCount = useStudentNotificationCount(!admin && !DEMO && role === "STUDENT");
  const studentNotificationCount: StudentNotificationCountState = DEMO
    ? { count: demoUnreadNotificationCount(state), loading: false, error: false, reload: async () => {} }
    : liveNotificationCount;
  const u = DEMO ? state.user : role ? { name: sess.profile?.fullName ?? "Admin", role: role === "STUDENT" ? "STUDENT" : "ADMIN" } as NonNullable<typeof state.user> : null;
  const logout = () => { if (DEMO) demoLogout(); else void sess.logout(); };
  useEffect(() => { if (ready && (!u || (admin && u.role !== "ADMIN") || (!admin && !DEMO && role !== "STUDENT"))) router.replace("/login"); }, [ready, u, admin, role, router]);
  useEffect(() => { setDrawerOpen(false); }, [path]);
  if (!ready || !u || (admin && u.role !== "ADMIN") || (!admin && !DEMO && role !== "STUDENT")) return <div className="p-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  const unread = studentNotificationCount.count ?? 0;
  const nav = admin ? (items ?? []).map(([h, l]) => ({ h, l: t(l), I: null as null })) : [...main.map(([h, k, I]) => ({ h, l: t(k), I })), ...extra.map(([h, l, I]) => ({ h, l: t(l), I }))];
  const crumbs = path.split("/").filter(Boolean);
  const pageLabel = adminGroups.flatMap((g) => g.items).find(([href]) => href === path)?.[1] ?? crumbs.at(-1)?.replaceAll("-", " ") ?? "Dashboard";
  const profileName = u.name || "Administrator";
  const signOut = () => { logout(); router.push("/"); };
  return <AdminActionCountsContext.Provider value={adminCounts}><StudentNotificationCountContext.Provider value={studentNotificationCount}><div className="min-h-dvh min-w-0 overflow-x-clip md:flex">
    {admin ? <>
      <aside className={cx("relative hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 md:sticky md:top-0 md:block md:h-dvh md:overflow-y-auto", collapsed ? "md:w-[76px] md:p-3" : "md:w-[264px] md:p-5")}>
        <div className={cx("flex items-center", collapsed ? "justify-center" : "justify-between")}><Link href="/admin" aria-label="Dibora Admin Console" className="min-w-0"><Logo />{!collapsed && <span className="ml-2 mt-1 block text-[10px] font-semibold uppercase tracking-[.13em] text-muted">Admin Console</span>}</Link>{!collapsed && <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold tracking-wide text-warning">ADMIN</span>}</div>
        <div className="mt-6"><AdminNavigation collapsed={collapsed} query={navSearch} counts={adminCounts.counts} countsLoading={adminCounts.loading} countsError={adminCounts.error} onRetry={adminCounts.reload} /></div>
        <div className={cx("mt-7 border-t border-border pt-4", collapsed && "flex justify-center")}><button type="button" onClick={signOut} title={collapsed ? "Log out" : undefined} className={cx("flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-error/5 hover:text-error", collapsed && "px-2")}><LogOut size={17} aria-hidden="true" />{!collapsed && "Log out"}</button></div>
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="absolute bottom-5 ml-1 hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-text lg:flex">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      </aside>
      {drawerOpen && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" /><aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] overflow-y-auto bg-surface p-5 shadow-xl"><div className="mb-6 flex items-center justify-between"><div><Logo /><p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted">Admin Console</p></div><button onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="rounded-lg p-2 hover:bg-bg"><X size={20} /></button></div><AdminNavigation query={navSearch} onNavigate={() => setDrawerOpen(false)} counts={adminCounts.counts} countsLoading={adminCounts.loading} countsError={adminCounts.error} onRetry={adminCounts.reload} /><button type="button" onClick={signOut} className="mt-7 flex min-h-11 items-center gap-3 border-t border-border pt-4 text-sm text-muted"><LogOut size={17} />Log out</button></aside></div>}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-3 border-b border-border bg-bg/95 px-3 backdrop-blur sm:px-6">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open admin navigation"><Menu size={19} /></button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm md:flex" aria-label="Breadcrumb"><Link href="/admin" className="text-muted hover:text-primary">Admin</Link>{path !== "/admin" && <><span className="text-border">/</span><span className="truncate font-semibold capitalize text-text">{pageLabel}</span></>}</div>
          <label className="relative ml-auto hidden w-full max-w-[320px] md:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={navSearch} onChange={(e) => setNavSearch(e.target.value)} placeholder="Find an admin page…" aria-label="Filter admin navigation" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /><span className="sr-only">Filters the admin navigation menu</span></label>
          <div className="flex items-center gap-2"><LocaleSwitch /><ThemeToggle /><span className="hidden h-8 w-px bg-border sm:block" /><div className="hidden max-w-[180px] items-center gap-2 sm:flex"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserCircle size={19} /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{profileName}</span><span className="block text-[10px] text-muted">Administrator</span></span></div><button type="button" onClick={signOut} className="rounded-lg p-2 text-muted hover:bg-error/5 hover:text-error sm:hidden" aria-label="Log out"><LogOut size={18} /></button></div>
        </header>
        {navSearch.trim() && <div className="border-b border-border bg-surface px-4 py-2 text-xs text-muted md:hidden">Page search is available in the desktop sidebar.</div>}
        <main className="mx-auto min-h-[calc(100dvh-68px)] max-w-[1600px] px-3 pb-8 pt-5 sm:px-6 sm:pt-7 lg:px-8">{children}</main>
      </div>
    </> : <>
      <aside aria-label="Sidebar" className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 md:sticky md:top-0 md:block md:h-dvh md:overflow-y-auto"><Logo /><nav className="mt-6 space-y-1">{nav.map(({ h, l, I }) => { const isNotifications = h === "/notifications"; const active = path === h || (h !== "/admin" && path.startsWith(h + "/")); return <Link key={h} href={h} aria-label={isNotifications && unread > 0 ? `Notifications, ${unread} unread notifications` : undefined} aria-current={path === h ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-primary text-white" : "hover:bg-border/50")}>{I && <I size={18} aria-hidden="true" />}{l}{isNotifications && unread > 0 && <span className="ml-auto rounded-full bg-info/15 px-2 py-0.5 text-xs font-bold tabular-nums text-info"><span aria-hidden="true">{unread.toLocaleString()}</span><span className="sr-only">{unread} unread notifications</span></span>}</Link>; })}</nav><StudentNotificationCountStatus state={studentNotificationCount} /><button onClick={signOut} className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-border/50"><LogOut size={18} aria-hidden="true" />Log out</button></aside>
      <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-bg/90 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-5"><div className="md:hidden"><Logo /></div><p className="hidden max-w-[40vw] truncate text-sm text-muted md:block">{u.name}</p><div className="flex items-center gap-1"><LocaleSwitch /><ThemeToggle /></div></header><main className="mx-auto max-w-6xl px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 md:p-8">{children}</main></div>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">{[...main.slice(0, 4), ["/more", "more", Menu] as const].map(([h, k, I]) => { const mobileRouteActive = main.slice(0, 4).some(([route]) => path === route || path.startsWith(route + "/")); const active = path === h || (h === "/more" && !mobileRouteActive); const moreLabel = h === "/more" && unread > 0 ? `More, ${unread} unread notifications` : undefined; return <Link key={h} href={h} aria-label={moreLabel} aria-current={active ? "page" : undefined} className={cx("flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-colors", active ? "font-bold text-primary" : "text-muted hover:text-primary")}><span className="relative inline-flex"><I size={20} aria-hidden="true" />{h === "/more" && unread > 0 && <span aria-hidden="true" className="absolute -right-3 -top-2 rounded-full bg-info/15 px-1.5 text-[9px] font-bold tabular-nums text-info">{unread.toLocaleString()}</span>}</span>{t(k)}</Link>; })}</nav>
    </>}
  </div></StudentNotificationCountContext.Provider></AdminActionCountsContext.Provider>;
}
