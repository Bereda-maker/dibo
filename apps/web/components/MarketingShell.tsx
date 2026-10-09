import Link from "next/link";
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

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 shadow-[0_8px_30px_rgba(11,93,59,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5 lg:px-6">
          <Logo />
          <nav
            aria-label="Main"
            className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface/70 p-1 shadow-sm lg:flex"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-muted transition-all duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LocaleSwitch />
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-light hover:shadow-lg active:translate-y-0 sm:px-4"
            >
              Start free
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                ↗
              </span>
            </Link>
          </div>
        </div>
        <nav
          aria-label="Mobile"
          className="flex gap-1 overflow-x-auto border-t border-border/70 bg-surface/40 px-2 py-2.5 text-sm lg:hidden sm:px-5"
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-full px-3.5 py-2 font-semibold text-muted transition-colors duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div>{children}</div>
      <footer className="mt-20 border-t border-border py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4">
          <p>
            © {new Date().getFullYear()} Dibora. Exam Readiness is an internal learning metric, not an official prediction.
          </p>
          <p className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
