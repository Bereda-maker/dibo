import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Bot, ClipboardCheck, ClipboardList, Dumbbell, Gauge, SearchCheck, ShieldCheck, Target, Trophy } from "lucide-react";
import { ReadinessCard } from "../../components/ReadinessCard";
import { DiboraHero } from "../../components/DiboraHero";
import { AccountAwareLink } from "../../components/AccountAwareLink";

const problems = [
  ["A clear next step", "Turn a big syllabus into a manageable study plan."],
  ["Practice with purpose", "Focus on the topics that need your attention most."],
  ["Progress you can see", "Use your results to keep improving, one session at a time."],
] as const;
const loop = [
  ["Assess", "Find your starting point"], ["Learn", "Review focused notes"], ["Practice", "Build topic confidence"],
  ["Test", "Try timed mock exams"], ["Reflect", "Understand your results"], ["Improve", "Repeat with a plan"],
] as const;
export const features = [
  [ClipboardList, "Diagnostic assessment", "See where you are strong and where to focus first."],
  [BookOpen, "Structured notes", "Review clear explanations, formulas, examples and exam tips."],
  [Dumbbell, "Question bank & practice", "Practice by topic, difficulty, weak area or past mistakes."],
  [ClipboardCheck, "Timed mock exams", "Build exam confidence with realistic timed practice and review."],
  [Bot, "AI study assistant", "Get focused explanations grounded in approved learning content."],
  [BarChart3, "Progress analytics", "Follow accuracy, consistency and topic-level progress over time."],
  [Target, "Personalized recommendations", "Know what to work on next and why it matters."],
  [Gauge, "Exam readiness", "Use a learning metric to guide your preparation—not predict official results."],
  [Trophy, "Healthy study milestones", "Celebrate steady effort and meaningful progress."],
  [SearchCheck, "Smart search", "Find subjects, notes, topics and practice material quickly."],
] as const;

export default function Home() {
  return (
    <>
      <DiboraHero />
      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14" aria-label="A sample of Dibora learning insights">
        <div className="grid items-stretch gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[1.75rem] border border-border bg-surface p-4 shadow-card sm:p-6"><ReadinessCard overall={72} delta={4} parts={{ knowledge: 78, practice: 72, mock: 69, consistency: 81 }} /></div>
          <div className="flex flex-col justify-between gap-5 rounded-[1.75rem] bg-secondary p-6 text-white shadow-lg sm:p-8">
            <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80"><Target className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> A next step, not a guess</span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">Make your effort count.</h2>
              <p className="mt-3 max-w-md leading-7 text-white/75">Dibora connects what you learn, the questions you practice and the progress you make—so it is easier to keep moving forward.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-white/60">Example study focus</p><p className="mt-1 font-bold">Physics <span className="text-white/45">/</span> Mechanics</p><p className="mt-1 text-sm text-white/70">Practice 15 questions, then review what felt difficult.</p></div>
          </div>
        </div>
      </section>
      <section className="border-y border-border/70 bg-surface/55">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Made for the journey</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Studying hard matters. Studying with direction helps.</h2><p className="mt-3 leading-7 text-muted">When the syllabus feels huge, a small, clear next step can make all the difference.</p></div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">{problems.map(([title, body], i) => <article key={title} className="group rounded-3xl border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card sm:p-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">0{i + 1}</span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{body}</p></article>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">A rhythm you can repeat</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">One learning loop. Better every time.</h2></div><Link href="/how-it-works" className="group inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary hover:text-primary">See how it works <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
        <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{loop.map(([title, body], i) => <li key={title} className="relative rounded-2xl border border-border bg-surface p-4 shadow-sm"><span className="text-xs font-extrabold uppercase tracking-widest text-accent">Step 0{i + 1}</span><p className="mt-2 font-bold">{title}</p><p className="mt-1 text-sm leading-5 text-muted">{body}</p>{i < loop.length - 1 && <span aria-hidden="true" className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-border bg-background lg:block" />}</li>)}</ol>
      </section>
      <section className="bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Everything works together</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tools for every part of preparation.</h2><p className="mt-3 max-w-2xl leading-7 text-muted">A connected study space for learning, practice, exam preparation and reflection.</p></div><Link href="/features" className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-bold transition hover:border-primary hover:text-primary">Explore features <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.slice(0, 6).map(([Icon, title, body], i) => <article key={title} className="rounded-3xl border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card sm:p-6"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={21} aria-hidden="true" /></span><span className="text-xs font-bold text-muted">0{i + 1}</span></div><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{body}</p></article>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16"><div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12"><div aria-hidden="true" className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" /><div className="relative max-w-2xl"><span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80"><ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> Your next step starts here</span><h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Build a study routine that moves you forward.</h2><p className="mt-3 leading-7 text-white/75">Sign in with Google or Telegram. New students can set up an account as part of sign-in.</p><AccountAwareLink className="group mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-secondary shadow-sm transition hover:-translate-y-0.5 hover:bg-[#dfc15d]">Continue to Dibora <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></AccountAwareLink></div></div></section>
    </>
  );
}
