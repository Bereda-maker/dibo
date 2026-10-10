import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { features } from "../page";
import { AccountAwareLink } from "../../../components/AccountAwareLink";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";

export const metadata = { title: "Features" };
export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="Your study toolkit" title="Every part of preparation, working together." description="From the first diagnostic to your final review, Dibora gives you a structured way to learn, practise and understand your progress." />
      <section aria-label="Dibora features" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, title, body], index) => (
          <article key={title} className="group rounded-3xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card sm:p-6">
            <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white"><Icon size={22} aria-hidden="true" /></span><span className="text-xs font-extrabold tracking-widest text-accent">0{index + 1}</span></div>
            <h2 className="mt-5 text-lg font-bold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 flex flex-col gap-5 rounded-3xl border border-accent/25 bg-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-primary"><ShieldCheck size={18} aria-hidden="true" /></span><div><h2 className="font-bold">Built around steady progress</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Readiness is a learning guide, not a prediction of official exam results. Your personal learning information stays private.</p></div></div>
        <ul className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-primary">{["Learn", "Practice", "Reflect"].map((item) => <li key={item} className="inline-flex items-center gap-1.5"><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
      </section>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-secondary px-5 py-6 text-white sm:px-7"><div><p className="font-bold">Ready to find your focus?</p><p className="mt-1 text-sm text-white/70">Start with a free student account.</p></div><AccountAwareLink className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-bold text-secondary transition hover:-translate-y-0.5">Continue with Google or Telegram <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></AccountAwareLink></div>
    </div>
  );
}
