"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, School, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";

const steps = ["Stream", "Location", "School", "Dedication"] as const;
type Stream = "natural" | "social" | "";
type SchoolType = "boarding" | "private" | "government" | "";

type PlannerData = {
  stream: Stream;
  city: string;
  region: string;
  examYear: string;
  school: string;
  schoolType: SchoolType;
  hours: string;
};

const initialData: PlannerData = {
  stream: "",
  city: "",
  region: "",
  examYear: "",
  school: "",
  schoolType: "",
  hours: "",
};

const streamOptions = [
  { id: "natural" as const, title: "Natural Science", note: "Biology, Chemistry, Physics and Mathematics" },
  { id: "social" as const, title: "Social Science", note: "Languages, history, geography and social studies" },
];

const schoolOptions = [
  { id: "boarding" as const, title: "Boarding", note: "I study at a boarding school" },
  { id: "private" as const, title: "Private school", note: "I study at a private school" },
  { id: "government" as const, title: "Government school", note: "I study at a government school" },
];

const hourOptions = [
  { value: "1", label: "Up to 1 hour", note: "A small start" },
  { value: "2", label: "2 hours", note: "A steady routine" },
  { value: "4", label: "3–4 hours", note: "Focused progress" },
  { value: "6", label: "5–6 hours", note: "Serious preparation" },
  { value: "8", label: "7+ hours", note: "An intensive plan" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreBand(percentage: number) {
  if (percentage >= 82) return "550+";
  if (percentage >= 70) return "500+";
  if (percentage >= 56) return "450+";
  if (percentage >= 36) return "400+";
  return "300+";
}

function calculateEstimate(data: PlannerData) {
  const hours = Number(data.hours);
  const currentYear = new Date().getFullYear();
  const examYear = Number(data.examYear);
  let percentage = 18 + Math.min(hours, 8) * 8;

  if (data.stream === "natural") percentage += 3;
  if (data.stream === "social") percentage += 2;
  if (examYear > currentYear) percentage += Math.min(6, examYear - currentYear);

  percentage = Math.round(clamp(percentage, 20, 92));
  return { percentage, band: scoreBand(percentage), hours };
}

function fieldClass(hasError: boolean) {
  return `min-h-12 w-full rounded-2xl border bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 ${hasError ? "border-error" : "border-border"}`;
}

export function GoalPlanner() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PlannerData>(initialData);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const result = useMemo(() => calculateEstimate(data), [data]);

  const update = <K extends keyof PlannerData>(key: K, value: PlannerData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const validateStep = () => {
    if (step === 1 && !data.stream) return "Choose a stream to continue.";
    if (step === 2 && (!data.city.trim() || !data.region.trim() || !data.examYear)) return "Add your city, region, and exam year.";
    if (step === 3 && (!data.school.trim() || !data.schoolType)) return "Add your school and choose a school type.";
    if (step === 4 && (!data.hours || Number(data.hours) <= 0)) return "Choose how many hours you can study each day.";
    return "";
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step === steps.length) setShowResult(true);
    else setStep((current) => current + 1);
  };

  const back = () => {
    setError("");
    setShowResult(false);
    setStep((current) => Math.max(1, current - 1));
  };

  const reset = () => {
    setData(initialData);
    setStep(1);
    setError("");
    setShowResult(false);
  };

  return (
    <main className="relative isolate overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute -right-32 top-24 -z-10 h-80 w-80 rounded-full border-[42px] border-primary/5" />
      <div aria-hidden className="pointer-events-none absolute -left-32 bottom-12 -z-10 h-72 w-72 rounded-full border-[34px] border-accent/10" />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <div className="mb-7 flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-primary"><ArrowLeft size={16} aria-hidden="true" /> Deborah home</Link>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">Free planner</span>
          </div>
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Target size={15} className="text-accent" aria-hidden="true" /> Grade 12 goal planner</p>
            <h1 className="text-balance text-3xl font-black leading-tight tracking-tight text-primary sm:text-5xl">Choose a goal. Build a plan.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">Answer four quick questions and get a starting estimate for your Ethiopian Grade 12 National Examination preparation.</p>
          </div>

          <div className="mb-6" aria-label="Planner progress">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-muted"><span>Step {showResult ? 4 : step} of {steps.length}</span><span>{showResult ? "Your estimate" : steps[step - 1]}</span></div>
            <div className="flex gap-2">{steps.map((label, index) => <div key={label} className={`h-2 flex-1 rounded-full ${index + 1 <= step ? "bg-primary" : "bg-border"}`} aria-label={`${label}: ${index + 1 <= step ? "complete or current" : "not started"}`} />)}</div>
          </div>

          {!showResult ? (
            <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-card sm:p-8" aria-labelledby="planner-step-title">
              {step === 1 && <div><StepHeading icon={<Sparkles size={18} aria-hidden="true" />} eyebrow="Step 1" title="Which stream are you preparing for?" body="Choose the path that matches your Grade 12 subjects." /><div className="mt-7 grid gap-3 sm:grid-cols-2">{streamOptions.map((option) => <ChoiceButton key={option.id} selected={data.stream === option.id} onClick={() => update("stream", option.id)} title={option.title} note={option.note} />)}</div></div>}
              {step === 2 && <div><StepHeading icon={<MapPin size={18} aria-hidden="true" />} eyebrow="Step 2" title="Where and when are you preparing?" body="This helps Deborah shape the right study context for you." /><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">City<input className={fieldClass(!!error && !data.city.trim())} value={data.city} onChange={(event) => update("city", event.target.value)} placeholder="e.g. Addis Ababa" /></label><label className="text-sm font-bold">Region<input className={fieldClass(!!error && !data.region.trim())} value={data.region} onChange={(event) => update("region", event.target.value)} placeholder="e.g. Oromia" /></label><label className="text-sm font-bold sm:col-span-2">Exam year<input className={fieldClass(!!error && !data.examYear)} type="number" min="2026" max="2035" value={data.examYear} onChange={(event) => update("examYear", event.target.value)} placeholder="e.g. 2027" /></label></div></div>}
              {step === 3 && <div><StepHeading icon={<School size={18} aria-hidden="true" />} eyebrow="Step 3" title="Tell us about your school" body="Your school type gives context to the plan; it does not define your potential." /><label className="mt-7 block text-sm font-bold">School name<input className={fieldClass(!!error && !data.school.trim())} value={data.school} onChange={(event) => update("school", event.target.value)} placeholder="Enter your school name" /></label><div className="mt-6 grid gap-3 sm:grid-cols-3">{schoolOptions.map((option) => <ChoiceButton key={option.id} selected={data.schoolType === option.id} onClick={() => update("schoolType", option.id)} title={option.title} note={option.note} compact />)}</div></div>}
              {step === 4 && <div><StepHeading icon={<Clock3 size={18} aria-hidden="true" />} eyebrow="Step 4" title="How much time can you give each day?" body="Choose a commitment you can repeat, not a number that sounds impressive." /><div className="mt-7 grid gap-3 sm:grid-cols-2">{hourOptions.map((option) => <ChoiceButton key={option.value} selected={data.hours === option.value} onClick={() => update("hours", option.value)} title={option.label} note={option.note} />)}</div></div>}
              {error && <p role="alert" className="mt-5 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</p>}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><button type="button" onClick={back} disabled={step === 1} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-border/40 disabled:invisible"><ArrowLeft size={16} aria-hidden="true" /> Back</button><button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-light">{step === steps.length ? "See my estimate" : "Continue"}<ArrowRight size={16} aria-hidden="true" /></button></div>
            </section>
          ) : <ResultCard data={data} result={result} onRestart={reset} />}
        </div>

        <aside className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-card lg:sticky lg:top-8">
          <div className="relative h-56 overflow-hidden bg-primary sm:h-64 lg:h-72"><img src="/images/dibora-farm-poster.jpg" alt="Ethiopian student studying with books" className="h-full w-full object-cover object-[72%_center]" /><div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/10 to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Deborah</p><p className="mt-2 text-xl font-black leading-tight">Your goal is a starting point, not a limit.</p></div></div>
          <div className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/20 text-warning"><Sparkles size={19} aria-hidden="true" /></span><div><p className="font-bold text-primary">A plan can change the result</p><p className="mt-1 text-sm leading-6 text-muted">Deborah helps you learn, practise, review and keep moving toward your next score.</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-background p-3"><p className="text-lg font-black text-primary">1 mo</p><p className="mt-1 text-[11px] font-semibold text-muted">focused start</p></div><div className="rounded-2xl bg-background p-3"><p className="text-lg font-black text-primary">3 mo</p><p className="mt-1 text-[11px] font-semibold text-muted">steady growth</p></div><div className="rounded-2xl bg-background p-3"><p className="text-lg font-black text-primary">6 mo</p><p className="mt-1 text-[11px] font-semibold text-muted">big ambition</p></div></div></div>
        </aside>
      </section>
    </main>
  );
}

function StepHeading({ icon, eyebrow, title, body }: { icon: React.ReactNode; eyebrow: string; title: string; body: string }) {
  return <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">{icon}{eyebrow}</p><h2 id="planner-step-title" className="mt-3 text-2xl font-black tracking-tight text-primary sm:text-3xl">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">{body}</p></div>;
}

function ChoiceButton({ selected, onClick, title, note, compact = false }: { selected: boolean; onClick: () => void; title: string; note: string; compact?: boolean }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`group relative ${compact ? "min-h-[92px]" : "min-h-[112px]"} rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-background"}`}><span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><Check size={14} aria-hidden="true" /></span><span className="block pr-8 text-sm font-black text-primary">{title}</span><span className="mt-2 block max-w-[22rem] text-xs leading-5 text-muted">{note}</span></button>;
}

function ResultCard({ data, result, onRestart }: { data: PlannerData; result: { percentage: number; band: string; hours: number }; onRestart: () => void }) {
  const schoolLabel = schoolOptions.find((option) => option.id === data.schoolType)?.title;
  const streamLabel = streamOptions.find((option) => option.id === data.stream)?.title;
  return <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-card sm:p-8" aria-labelledby="estimate-title"><div className="flex items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Sparkles size={15} className="text-accent" aria-hidden="true" /> Your starting estimate</p><h2 id="estimate-title" className="mt-3 text-2xl font-black tracking-tight text-primary sm:text-3xl">Your plan starts with clarity.</h2></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/20 text-warning"><Target size={22} aria-hidden="true" /></span></div><div className="mt-7 rounded-3xl bg-primary p-5 text-white sm:p-7"><p className="text-sm font-semibold text-white/70">Planning estimate</p><p className="mt-2 text-5xl font-black tracking-tight text-accent">{result.percentage}%</p><p className="mt-2 max-w-xl text-lg font-bold leading-7">You have an estimated chance to reach above <span className="text-accent">{result.band}</span> out of 600.</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent" style={{ width: `${result.percentage}%` }} /></div><p className="mt-3 text-xs leading-5 text-white/65">This is a starting-point estimate for planning, not an official exam prediction or guarantee.</p></div><div className="mt-5 rounded-2xl border border-accent/40 bg-accent/10 p-4"><p className="font-black text-primary">Do not worry—your result can change.</p><p className="mt-1 text-sm leading-6 text-muted">With consistent Deborah preparation, a focused learner can work from 400+ to 450+ in 1 month, 500+ in 3 months, and 550+ in 6 months.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Milestone time="1 month" path="400+ → 450+" /><Milestone time="3 months" path="400+ → 500+" /><Milestone time="6 months" path="400+ → 550+" /></div><div className="mt-5 rounded-2xl bg-background p-4 text-sm leading-6 text-muted"><p><span className="font-bold text-primary">Your plan context:</span> {streamLabel} · {result.hours} hour{result.hours === 1 ? "" : "s"}/day · {schoolLabel} · {data.examYear} exam.</p><p className="mt-1">City, region, school and exam year help personalize your plan; they do not define your potential.</p></div><div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-border/40"><ArrowLeft size={16} aria-hidden="true" /> Try again</button><Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-light">Start free today <ArrowRight size={16} aria-hidden="true" /></Link></div></section>;
}

function Milestone({ time, path }: { time: string; path: string }) {
  return <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{time}</p><p className="mt-2 font-black text-primary">{path}</p></div>;
}
