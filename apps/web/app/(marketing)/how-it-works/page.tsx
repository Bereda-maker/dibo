import { ArrowRight, Check, ClipboardCheck, Compass, GraduationCap, LineChart, NotebookPen } from "lucide-react";
import { AccountAwareLink } from "../../../components/AccountAwareLink";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";

export const metadata = { title: "How it works" };
const steps = [
  { title: "Sign in and set your goal", body: "Continue securely with Google or Telegram. New students create their Dibora account during sign-in, then fill in their learning profile.", Icon: GraduationCap, tag: "Start with you" },
  { title: "Discover your starting point", body: "Use a diagnostic to see which subjects and topics already feel solid—and which ones deserve more attention.", Icon: Compass, tag: "Find your focus" },
  { title: "Learn in small, focused sessions", body: "Review structured notes, examples, formulas and exam tips at a pace that fits your day.", Icon: NotebookPen, tag: "Build understanding" },
  { title: "Practise and test your progress", body: "Answer topic questions, revisit mistakes and use timed mock exams to get comfortable with the exam format.", Icon: ClipboardCheck, tag: "Put it into practice" },
  { title: "Reflect, adjust and keep going", body: "Check your topic-level progress and use recommendations to choose a helpful next step.", Icon: LineChart, tag: "Keep improving" },
];
export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="A simple study rhythm" title="A clear path from where you are to what is next." description="Dibora turns preparation into a repeatable cycle: understand your starting point, work on the right things and use your results to guide the next session." />
      <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[1.35rem] before:top-8 before:w-px before:bg-border sm:space-y-5 sm:before:left-[1.55rem]">
        {steps.map(({ title, body, Icon, tag }, index) => (
          <li key={title} className="relative grid gap-4 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[64px_1fr_auto] sm:items-center sm:gap-6 sm:p-6">
            <div className="relative z-10 grid h-11 w-11 place-items-center rounded-2xl border-4 border-background bg-primary text-white shadow-sm sm:h-12 sm:w-12"><Icon size={20} aria-hidden="true" /></div>
            <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Step 0{index + 1} · {tag}</p><h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">{body}</p></div>
            <span className="hidden h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary sm:grid"><Check size={17} aria-hidden="true" /></span>
          </li>
        ))}
      </ol>
      <section className="mt-8 grid gap-4 rounded-3xl bg-primary p-5 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">One step at a time</p><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Your study plan starts with a single session.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">No long setup form to begin—choose Google or Telegram, then complete the details that help personalize your learning.</p></div><AccountAwareLink className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-secondary transition hover:-translate-y-0.5">Start learning <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></AccountAwareLink></section>
    </div>
  );
}
