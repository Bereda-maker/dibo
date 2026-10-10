import Link from "next/link";
import { ArrowRight, BookOpenCheck, Compass, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";

export const metadata = { title: "About" };
const principles = [
  { title: "Start with understanding", body: "Help students see what they know and where a little more practice can make a difference.", Icon: Compass },
  { title: "Make learning practical", body: "Bring notes, questions, mock exams and progress insights into one connected study experience.", Icon: BookOpenCheck },
  { title: "Keep support responsible", body: "Treat AI as one study tool, protect student privacy and be honest about what a readiness score means.", Icon: ShieldCheck },
];
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="About Dibora" title="A more focused way to prepare for what comes next." description="Dibora is a learning and examination-preparation platform built for Ethiopian students. It connects structured content, practice, mock exams and personal progress in one place." />
      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><HeartHandshake size={22} aria-hidden="true" /></span><h2 className="mt-5 text-xl font-extrabold">Learning should feel less overwhelming.</h2><p className="mt-3 leading-7 text-muted">A big exam can make it hard to know where to start. Dibora is designed to help students turn that challenge into smaller, more manageable study sessions—with a clear focus, helpful practice and a way to reflect on progress.</p><p className="mt-3 leading-7 text-muted">The AI Study Assistant is one part of that experience, not a replacement for teachers or textbooks. It is intended to support learning with approved platform content and to acknowledge when it does not have an answer.</p></div>
        <aside className="relative overflow-hidden rounded-3xl bg-secondary p-6 text-white shadow-card sm:p-8"><div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[20px] border-white/10" /><span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-accent"><Sparkles size={22} aria-hidden="true" /></span><p className="relative mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Our aim</p><h2 className="relative mt-2 text-2xl font-extrabold">More confidence in every next step.</h2><p className="relative mt-3 leading-7 text-white/70">A steady study rhythm, shaped around the learner—not just another place to scroll through questions.</p><Link href="/how-it-works" className="relative group mt-5 inline-flex items-center gap-2 font-bold underline decoration-accent decoration-2 underline-offset-4">See how the journey works <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></aside>
      </section>
      <section className="mt-10"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">What guides the product</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Useful, focused and built with care.</h2></div><div className="mt-5 grid gap-4 md:grid-cols-3">{principles.map(({ title, body, Icon }, index) => <article key={title} className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><span className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} aria-hidden="true" /></span><span className="text-xs font-extrabold tracking-widest text-accent">0{index + 1}</span></span><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{body}</p></article>)}</div></section>
      <p className="mt-8 rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm leading-6 text-muted"><strong className="text-text">A note about Exam Readiness:</strong> it is an internal learning metric intended to help students plan their study. It is not a prediction of official results.</p>
    </div>
  );
}
