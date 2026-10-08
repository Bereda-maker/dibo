import Link from "next/link";
import { ClipboardList, BookOpen, Dumbbell, ClipboardCheck, BarChart3, Bot, Target, Gauge, Award, SearchCheck } from "lucide-react";
import { ReadinessCard } from "../../components/ReadinessCard";
import { DiboraHero } from "../../components/DiboraHero";

const problems = ["Not knowing what to study next", "Weak areas that stay hidden", "No structured practice", "Little real exam simulation", "Progress that is hard to track", "No personal academic support"];
const loop = [["Assess", "Find your starting point"], ["Learn", "Short, structured notes"], ["Practice", "Targeted questions"], ["Test", "Timed mock exams"], ["Analyze", "See topic-level results"], ["Improve", "Fix weak areas, repeat"]];
export const features = [
  [ClipboardList, "Diagnostic Assessment", "Know your level in every subject and topic from day one."], [BookOpen, "Short Notes", "Clear notes with formulas, examples, mistakes and exam tips."],
  [Dumbbell, "Question Bank & Practice", "Practice by topic, difficulty, weak area or past mistakes with instant feedback."], [ClipboardCheck, "Mock Exams", "Timed exams with autosave and detailed review."],
  [Bot, "AI Study Assistant", "Explains using approved platform content and your own results."], [BarChart3, "Progress Analytics", "Accuracy, streaks and topic performance over time."],
  [Target, "Personalized Recommendations", "A clear next step with the reason behind it."], [Gauge, "Exam Readiness", "An internal learning score that shows how you are improving."], [Award, "Achievements", "Milestones that reward steady, healthy study habits."], [SearchCheck, "Smart Search", "Find notes, topics, questions and exams fast."],
] as const;

export default function Home() {
  return (<>
    <DiboraHero />
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid items-center gap-4 md:grid-cols-2">
        <ReadinessCard overall={72} delta={4} parts={{ knowledge: 78, practice: 72, mock: 69, consistency: 81 }} />
        <div className="rounded-card border border-border bg-surface p-4 text-sm shadow-card">
          <p className="text-muted">Today&apos;s recommendation</p>
          <p className="font-semibold">Physics → Mechanics · Practice 15 questions</p>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-4 py-10"><h2 className="text-2xl font-bold">Studying hard is not the same as studying right</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{problems.map((p) => <li key={p} className="rounded-card border border-border bg-surface p-4">{p}</li>)}</ul></section>
    <section className="mx-auto max-w-6xl px-4 py-10"><h2 className="text-2xl font-bold">One loop that keeps improving you</h2>
      <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{loop.map(([a, b], i) => <li key={a} className="rounded-card border border-border bg-surface p-4"><span className="font-bold text-accent">{i + 1}</span><p className="font-semibold">{a}</p><p className="text-sm text-muted">{b}</p></li>)}</ol></section>
    <section className="mx-auto max-w-6xl px-4 py-10"><h2 className="text-2xl font-bold">Everything you need in one place</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([I, t, d]) => <div key={t} className="rounded-card border border-border bg-surface p-5"><I className="text-primary" size={22} aria-hidden /><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>)}</div></section>
    <section className="mx-auto max-w-6xl px-4 py-10"><div className="rounded-card bg-primary p-8 text-center text-white"><h2 className="text-2xl font-bold">Start free today</h2><p className="mt-2 opacity-90">Create an account, take the diagnostic, and get your first study plan in minutes.</p><Link href="/register" className="mt-5 inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-black">Create free account</Link></div></section></>);
}
