import { Sparkles } from "lucide-react";

export function MarketingPageHeader({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description: string; centered?: boolean }) {
  return (
    <header className={`relative mb-9 overflow-hidden rounded-[2rem] border border-border/80 bg-gradient-to-br from-surface via-surface to-primary/5 px-5 py-8 shadow-card sm:px-9 sm:py-10 ${centered ? "text-center" : ""}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-accent/10" />
      <div className={`relative ${centered ? "mx-auto max-w-3xl" : "max-w-3xl"}`}>
        <p className={`mb-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary ${centered ? "justify-center" : ""}`}>
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />{eyebrow}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl md:text-[2.75rem] md:leading-tight">{title}</h1>
        <p className={`mt-3 max-w-2xl text-base leading-7 text-muted sm:text-lg ${centered ? "mx-auto" : ""}`}>{description}</p>
      </div>
    </header>
  );
}
