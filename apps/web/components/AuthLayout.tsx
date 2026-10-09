import Image from "next/image";
import Link from "next/link";
import { BookOpenCheck, Check, GraduationCap, Sparkles, Target } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Dibora";

export function AuthLayout({ children, mode }: { children: React.ReactNode; mode: "login" | "register" }) {
  const isRegister = mode === "register";

  return (
    <div className="relative isolate min-h-[calc(100vh-4.5rem)] overflow-hidden bg-background px-3 py-7 sm:px-6 sm:py-10">
      <div aria-hidden className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border/80 bg-surface shadow-[0_32px_100px_-42px_rgba(11,93,59,0.32)] lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-[#123f30] p-10 text-white lg:flex xl:p-12">
          <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden className="absolute -right-5 top-12 h-60 w-60 rounded-full border border-white/10" />
          <div aria-hidden className="absolute -bottom-36 -left-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg shadow-black/10">
              <Image src="/images/dibora-logo.png" alt="" aria-hidden width={56} height={56} className="h-full w-full object-contain" priority />
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight">{APP_NAME}</span>
              <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/65">Learn · Grow · Achieve</span>
            </span>
          </div>

          <div className="relative z-10 my-12 max-w-md">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#f5cb55]" aria-hidden /> A clearer way to prepare
            </span>
            <h2 className="text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-[3.25rem]">
              {isRegister ? "Your next chapter starts here." : "Make every study session count."}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/75">
              {isRegister
                ? "Set up your learning profile and get a plan built around your goals, subjects, and pace."
                : "Find your focus, build steady habits, and see your progress turn into confidence."}
            </p>
          </div>

          <div className="relative z-10 rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-xl shadow-black/10 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><BookOpenCheck className="h-5 w-5 text-[#f5cb55]" aria-hidden /></span>
                <div><p className="text-sm font-bold">Your learning, in focus</p><p className="mt-0.5 text-xs text-white/60">Small steps add up.</p></div>
              </div>
              <span className="rounded-full bg-[#f5cb55]/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#f5cb55]">Dibora</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] px-3.5 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><Target className="h-4 w-4 text-white/85" aria-hidden /></span><span className="flex-1 text-sm text-white/85">Know what to work on next</span><Check className="h-4 w-4 text-[#f5cb55]" aria-hidden /></div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] px-3.5 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><GraduationCap className="h-4 w-4 text-white/85" aria-hidden /></span><span className="flex-1 text-sm text-white/85">Practice with a clear purpose</span><Check className="h-4 w-4 text-[#f5cb55]" aria-hidden /></div>
            </div>
          </div>
          <p className="relative z-10 mt-6 text-xs text-white/50">Designed for Ethiopian learners, wherever you study.</p>
        </aside>

        <section className="min-w-0 px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12 xl:px-14">
          <div className="mb-8 flex items-center lg:hidden">
            <Link href="/" aria-label="Dibora home" className="inline-flex items-center gap-2.5 rounded-xl">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-accent/25 bg-white p-1 shadow-sm"><Image src="/images/dibora-logo.png" alt="" aria-hidden width={44} height={44} className="h-full w-full object-contain" priority /></span>
              <span><span className="block text-lg font-extrabold tracking-tight text-primary">{APP_NAME}</span><span className="block text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">Learn · Grow · Achieve</span></span>
            </Link>
          </div>
          {children}
        </section>
      </div>
      <p className="relative mt-5 text-center text-xs text-muted">By continuing, you agree to Dibora’s <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">privacy terms</Link>.</p>
    </div>
  );
}
