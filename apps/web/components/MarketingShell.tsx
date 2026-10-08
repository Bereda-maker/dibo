import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle, LocaleSwitch } from "./Controls";
const links = [["features", "Features"], ["how-it-works", "How it works"], ["pricing", "Pricing"], ["faq", "FAQ"], ["about", "About"], ["contact", "Contact"]];
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
      <Logo /><nav aria-label="Main" className="hidden gap-5 text-sm font-medium lg:flex">{links.map(([h, l]) => <Link key={h} href={`/${h}`} className="hover:text-primary">{l}</Link>)}</nav>
      <div className="flex items-center gap-1"><LocaleSwitch /><ThemeToggle /><Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold sm:block">Log in</Link><Link href="/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Start free</Link></div></div>
      <nav aria-label="Mobile" className="flex gap-4 overflow-x-auto border-t border-border px-4 py-2 text-sm lg:hidden">{links.map(([h, l]) => <Link key={h} href={`/${h}`} className="whitespace-nowrap">{l}</Link>)}</nav></header>
    <div>{children}</div>
    <footer className="mt-20 border-t border-border py-8 text-sm text-muted"><div className="mx-auto max-w-6xl px-4 flex flex-wrap justify-between gap-3"><p>© {new Date().getFullYear()} Dibora. Exam Readiness is an internal learning metric, not an official prediction.</p><p className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></p></div></footer></div>);
}
