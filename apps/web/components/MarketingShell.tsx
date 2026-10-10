"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useSession } from "../lib/session";
import { useStore } from "../lib/store";
import { DEMO } from "../lib/config";
import { Logo } from "./Logo";
import { ThemeToggle, LocaleSwitch } from "./Controls";

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
const ctaClass = "group inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-light hover:shadow-lg active:translate-y-0 sm:px-5";

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "D";
}

function AccountMenu({ name, initials, dashboardHref, isStudent, onLogout }: { name: string; initials: string; dashboardHref: string; isStudent: boolean; onLogout: () => void }) {
  return (
    <details className="group/account relative">
      <summary aria-label={`Open ${name}'s account menu`} className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-surface px-1.5 py-1.5 shadow-sm transition hover:border-primary/40 hover:shadow-md [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white ring-2 ring-accent/35">{initials}</span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-text sm:inline">{name.split(/\s+/)[0]}</span>
        <ChevronDown size={15} className="mr-1 text-muted transition-transform group-open/account:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-xl">
        <div className="border-b border-border px-3 py-2.5"><p className="truncate text-sm font-bold text-text">{name}</p><p className="mt-0.5 text-xs font-medium text-muted">{isStudent ? "Student account" : "Administrator"}</p></div>
        <Link href={dashboardHref} className="mt-1 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard size={16} aria-hidden="true" />{isStudent ? "My learning" : "Admin dashboard"}</Link>
        {isStudent && <Link href="/profile" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text transition hover:bg-primary/10 hover:text-primary"><UserRound size={16} aria-hidden="true" />My profile</Link>}
        <button type="button" onClick={onLogout} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted transition hover:bg-error/10 hover:text-error"><LogOut size={16} aria-hidden="true" />Log out</button>
      </div>
    </details>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const store = useStore();
  const router = useRouter();
  const ready = DEMO ? store.ready : session.ready;
  const role = DEMO ? store.state.user?.role ?? null : session.role;
  const signedIn = ready && !!role;
  const isStudent = role === "STUDENT";
  const name = DEMO ? store.state.user?.name ?? "Student" : isStudent ? session.profile?.displayName || session.profile?.fullName || "Student" : "Admin";
  const initials = getInitials(name);
  const dashboardHref = role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
  const logout = () => {
    if (DEMO) store.logout();
    else void session.logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/95 shadow-[0_8px_30px_rgba(11,93,59,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-3 py-2.5 sm:px-5 lg:flex-nowrap lg:px-6">
          <div className="flex min-h-12 w-full items-center justify-between gap-3 lg:w-auto lg:shrink-0">
            <Logo />
            <div className="lg:hidden">
              {signedIn ? <AccountMenu name={name} initials={initials} dashboardHref={dashboardHref} isStudent={isStudent} onLogout={logout} /> : ready ? <Link href="/login" className={ctaClass}>Start learning <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span></Link> : <span aria-hidden="true" className="h-11 w-32 animate-pulse rounded-full bg-border/60" />}
            </div>
          </div>
          <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full border border-border/70 bg-surface/70 p-1 shadow-sm lg:flex">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-full px-2.5 py-2 text-[0.82rem] font-semibold text-muted transition-all duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 xl:px-3 xl:text-sm">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:shrink-0 lg:justify-end">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              {signedIn ? <AccountMenu name={name} initials={initials} dashboardHref={dashboardHref} isStudent={isStudent} onLogout={logout} /> : ready ? <><Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface">Log in</Link><Link href="/login" className={ctaClass}>Start free <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span></Link></> : <span aria-hidden="true" className="h-11 w-40 animate-pulse rounded-full bg-border/60" />}
            </div>
            {!signedIn && ready && <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface lg:hidden">Log in</Link>}
          </div>
        </div>
        <nav aria-label="Mobile" className="flex gap-1 overflow-x-auto border-t border-border/70 bg-surface/50 px-2 py-2 text-sm lg:hidden sm:px-5">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="shrink-0 rounded-full px-3.5 py-2 font-semibold text-muted transition-colors duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div>{children}</div>
      <footer className="mt-20 border-t border-border bg-surface/45 py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
          <p>© {new Date().getFullYear()} Dibora. Exam Readiness is an internal learning metric, not an official prediction.</p>
          <p className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></p>
        </div>
      </footer>
    </div>
  );
}
