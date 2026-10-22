"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";

type PlannerData = { stream: string; city: string; examYear: string; hours: string };
const initialData: PlannerData = { stream: "", city: "", examYear: "", hours: "" };
const steps = ["Study stream", "Your city", "Exam year", "Daily study time"];
const cities = [
  ["Addis Ababa", "Addis Ababa"], ["Dire Dawa", "Dire Dawa"], ["Bahir Dar", "Amhara"], ["Gondar", "Amhara"], ["Dessie", "Amhara"], ["Debre Markos", "Amhara"], ["Mekelle", "Tigray"], ["Adigrat", "Tigray"], ["Adama", "Oromia"], ["Jimma", "Oromia"], ["Hawassa", "Sidama"], ["Dilla", "Sidama"], ["Jijiga", "Somali"], ["Harar", "Harari"], ["Semera", "Afar"], ["Assosa", "Benishangul-Gumuz"], ["Gambela", "Gambela"], ["Sodo", "South Ethiopia"], ["Wolaita Sodo", "South Ethiopia"], ["Bonga", "South West Ethiopia"], ["Hosaena", "Central Ethiopia"],
] as const;
const hoursOptions = [["1", "Up to 1 hour"], ["2", "2 hours"], ["4", "3–4 hours"], ["6", "5–6 hours"], ["8", "7+ hours"]];
const selectClass = "mt-2 h-12 w-full appearance-none rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function estimate(data: PlannerData) {
  const year = Number(data.examYear);
  const percentage = Math.min(92, Math.max(20, Math.round(18 + Number(data.hours) * 8 + (data.stream === "natural" ? 3 : 2) + Math.min(6, Math.max(0, year - new Date().getFullYear())))));
  const band = percentage >= 82 ? "550+" : percentage >= 70 ? "500+" : percentage >= 56 ? "450+" : percentage >= 36 ? "400+" : "300+";
  const mood = percentage >= 70 ? { face: "🌟", headline: "You’ve got this!", message: "Your ambition is shining—keep showing up, one focused day at a time." } : percentage >= 45 ? { face: "💪", headline: "A strong start is yours.", message: "You’re building momentum. Every study session brings your goal closer." } : { face: "🌱", headline: "Every big goal starts small.", message: "Be kind to yourself: steady practice can grow your confidence and your score." };
  return { percentage, band, mood };
}

export function GoalPlanner() {
  const [data, setData] = useState(initialData);
  const [step, setStep] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [error, setError] = useState("");
  const region = cities.find(([city]) => city === data.city)?.[1] ?? "";
  const result = useMemo(() => estimate(data), [data]);
  const update = (key: keyof PlannerData, value: string) => { setData((current) => ({ ...current, [key]: value })); setError(""); };
  const values = [data.stream, data.city, data.examYear, data.hours];
  const next = () => {
    if (!values[step]) { setError("Choose an option to continue."); return; }
    setError("");
    if (step === steps.length - 1) setResultVisible(true);
    else setStep((current) => current + 1);
  };
  const back = () => { setError(""); if (resultVisible) setResultVisible(false); else setStep((current) => Math.max(0, current - 1)); };
  const reset = () => { setData(initialData); setStep(0); setError(""); setResultVisible(false); };

  return <main className="relative flex h-dvh items-center justify-center overflow-hidden bg-background px-3 py-3 sm:px-6 sm:py-4">
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-card md:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col justify-between bg-primary p-5 text-white sm:p-7 md:min-h-[500px] md:p-9">
        <div><Link href="/" className="text-xs font-bold text-white/75 transition hover:text-white">← Deborah home</Link>
          <p className="mt-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-accent"><Target size={15} /> Grade 12 goal planner</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Your goal.<br />Your next step.</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">One quick question at a time. Choose from the options—no typing needed.</p>
        </div>
        <div className="mt-5 hidden rounded-2xl border border-white/10 bg-white/5 p-4 md:block"><Sparkles size={18} className="text-accent" /><p className="mt-2 text-sm font-bold">Progress is built one day at a time.</p></div>
      </div>
      <div className="flex flex-col justify-center p-5 sm:p-7 md:p-9">
        {!resultVisible ? <>
          <div className="mb-6"><div className="mb-3 flex items-center justify-between text-xs font-bold text-muted"><span>Question {step + 1} of {steps.length}</span><span>{steps[step]}</span></div><div className="flex gap-2" aria-label="Progress">{steps.map((label, i) => <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}</div></div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Let’s make a plan</p>
          <h2 className="mt-1 text-2xl font-black text-primary">{["Which stream are you preparing for?", "Which city do you study in?", "When is your exam?", "How much can you study each day?"][step]}</h2>
          {step === 0 && <label className="mt-5 block text-xs font-bold text-muted">Study stream<select autoFocus className={selectClass} value={data.stream} onChange={(e) => update("stream", e.target.value)}><option value="">Select a stream</option><option value="natural">Natural Science</option><option value="social">Social Science</option></select></label>}
          {step === 1 && <><label className="mt-5 block text-xs font-bold text-muted">City<select autoFocus className={selectClass} value={data.city} onChange={(e) => update("city", e.target.value)}><option value="">Select your city</option>{cities.map(([city]) => <option key={city} value={city}>{city}</option>)}</select></label><div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3.5 py-3 text-xs"><span className="font-bold text-muted">Region</span><span className="font-bold text-primary">{region || "Filled in from your city"}</span></div></>}
          {step === 2 && <label className="mt-5 block text-xs font-bold text-muted">Exam year<select autoFocus className={selectClass} value={data.examYear} onChange={(e) => update("examYear", e.target.value)}><option value="">Select exam year</option>{Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}
          {step === 3 && <label className="mt-5 block text-xs font-bold text-muted">Study time each day<select autoFocus className={selectClass} value={data.hours} onChange={(e) => update("hours", e.target.value)}><option value="">Choose daily study time</option>{hoursOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-error">{error}</p>}
          <div className="mt-7 flex gap-3"><button type="button" onClick={back} disabled={step === 0} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background disabled:invisible"><ArrowLeft size={16} /> Back</button><button type="button" onClick={next} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary-light">{step === steps.length - 1 ? "See my estimate" : "Continue"}<ArrowRight size={17} /></button></div>
          <p className="mt-4 text-center text-[11px] text-muted">A friendly planning guide—not an official exam prediction.</p>
        </> : <>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary"><Sparkles size={15} className="text-accent" /> Your starting estimate</div>
          <div className="mt-4 rounded-2xl bg-primary p-5 text-white sm:p-6"><p className="text-5xl font-black tracking-tight text-accent">{result.percentage}%</p><p className="mt-1 text-sm font-semibold">estimated chance of reaching {result.band}+ out of 600</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${result.percentage}%` }} /></div></div>
          <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4"><p className="text-2xl" aria-hidden="true">{result.mood.face}</p><h2 className="mt-1 text-lg font-black text-primary">{result.mood.headline}</h2><p className="mt-1 text-sm leading-5 text-muted">{result.mood.message}</p></div>
          <p className="mt-4 text-xs leading-5 text-muted">This is a starting-point estimate, not a guarantee. Your stream, {data.hours} study hour{data.hours === "1" ? "" : "s"}/day and {data.examYear} exam help shape your plan. Your potential is not defined by a number.</p>
          <div className="mt-5 flex gap-3"><button type="button" onClick={back} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background"><ArrowLeft size={15} /> Review answers</button><Link href="/login" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white hover:bg-primary-light">Start free <ArrowRight size={15} /></Link></div>
          <button type="button" onClick={reset} className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-bold text-muted hover:text-primary"><RotateCcw size={13} /> Start over</button>
        </>}
      </div>
    </section>
  </main>;
}
