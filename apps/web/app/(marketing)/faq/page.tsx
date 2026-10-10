import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";

export const metadata = { title: "FAQ" };
const questions = [
  ["Getting started", [
    ["Is Dibora free to use?", "Yes. The Free plan includes a student profile, selected notes, limited daily practice, topic quizzes and basic progress. Premium adds access to the full question bank, mock exams and additional learning tools. Available prices and features are shown on the Plans page."],
    ["How do I create a student account?", "Continue with Google or Telegram from the sign-in page. On a first sign-in, Dibora creates your account and guides you to complete your student profile."],
    ["Which grades and subjects are supported?", "Dibora is designed for Ethiopian Grade 12 exam preparation. Available subjects and learning content are shown inside the app and may grow over time."],
  ]],
  ["Learning and progress", [
    ["Does Exam Readiness predict my official result?", "No. Exam Readiness is an internal learning metric that summarizes your practice and assessment progress. It is not a prediction of your official examination result."],
    ["What should I do if I get a question wrong?", "Use the explanation to review the idea, revisit related notes, then practise a similar question. Dibora can also surface past mistakes for another review."],
    ["Can the AI study assistant make mistakes?", "Yes. The assistant is designed to prioritize approved platform content and to say when it lacks information, but it can still be wrong. Check important facts with your textbook or teacher."],
  ]],
  ["Privacy and practical details", [
    ["Who can see my learning information?", "Your contact details, school, academic records and AI conversations are private and are not shown publicly. Joining the leaderboard is optional."],
    ["Which languages are available?", "The interface currently supports English, Amharic and Afaan Oromo for navigation and key strings. Content availability can vary by subject."],
    ["How do Premium payments work?", "Available payment options and instructions are shown during checkout. A plan is activated only after the payment is verified."],
  ]],
] as const;
export default function FAQPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="Good to know" title="Questions, answered clearly." description="A few useful details about getting started, using your study tools and understanding how Dibora supports your preparation." />
      <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
        <aside className="h-fit rounded-3xl bg-secondary p-6 text-white shadow-card lg:sticky lg:top-48"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Need another answer?</p><h2 className="mt-3 text-2xl font-extrabold">We can help you find your way.</h2><p className="mt-3 text-sm leading-6 text-white/70">Explore the learning tools, see how the study cycle works, or send the team a question.</p><Link href="/contact" className="group mt-5 inline-flex items-center gap-2 font-bold text-white underline decoration-accent decoration-2 underline-offset-4">Contact Dibora <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></aside>
        <div className="space-y-8">{questions.map(([group, items]) => <section key={group}><h2 className="mb-3 text-lg font-extrabold tracking-tight">{group}</h2><div className="space-y-3">{items.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors open:border-primary/30 sm:p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold leading-6 marker:hidden [&::-webkit-details-marker]:hidden"><span>{question}</span><ChevronDown size={18} className="shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-muted">{answer}</p></details>)}</div></section>)}</div>
      </div>
    </div>
  );
}
