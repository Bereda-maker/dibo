"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, ClipboardCheck, RotateCcw, Sparkles, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type PlannerData = { stream: string; city: string; otherCity: string; otherRegion: string; examYear: string; hours: string };
const initialData: PlannerData = { stream: "", city: "", otherCity: "", otherRegion: "", examYear: "", hours: "" };
const steps = ["Study stream", "Your city", "Exam year", "Daily study time"];
const cities = [
  ["Addis Ababa", "Addis Ababa"], ["Dire Dawa", "Dire Dawa"], ["Bahir Dar", "Amhara"], ["Gondar", "Amhara"], ["Dessie", "Amhara"], ["Debre Markos", "Amhara"], ["Mekelle", "Tigray"], ["Adigrat", "Tigray"], ["Adama", "Oromia"], ["Jimma", "Oromia"], ["Hawassa", "Sidama"], ["Dilla", "Sidama"], ["Jijiga", "Somali"], ["Harar", "Harari"], ["Semera", "Afar"], ["Assosa", "Benishangul-Gumuz"], ["Gambela", "Gambela"], ["Sodo", "South Ethiopia"], ["Wolaita Sodo", "South Ethiopia"], ["Bonga", "South West Ethiopia"], ["Hosaena", "Central Ethiopia"],
] as const;
const hoursOptions = [["1", "Up to 1 hour"], ["2", "2 hours"], ["4", "3–4 hours"], ["6", "5–6 hours"], ["8", "7+ hours"]];
const regions = ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray"];
const selectClass = "mt-2 h-12 w-full appearance-none rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function currentEthiopianYear() {
  const now = new Date();
  const gregorianYear = now.getFullYear();
  const ethiopianNewYear = new Date(gregorianYear, 8, 11);
  return gregorianYear - (now >= ethiopianNewYear ? 7 : 8);
}

function estimate(data: PlannerData) {
  const year = Number(data.examYear);
  const percentage = Math.min(92, Math.max(20, Math.round(18 + Number(data.hours) * 8 + (data.stream === "natural" ? 3 : 2) + Math.min(6, Math.max(0, year - currentEthiopianYear())))));
  const band = percentage >= 82 ? "550" : percentage >= 70 ? "500" : percentage >= 56 ? "450" : percentage >= 36 ? "400" : "300";
  const mood = percentage >= 70 ? { face: "🌟", headline: "You’ve got this!", message: "Your ambition is shining—keep showing up, one focused day at a time." } : percentage >= 45 ? { face: "💪", headline: "A strong start is yours.", message: "You’re building momentum. Every study session brings your goal closer." } : { face: "🌱", headline: "Every big goal starts small.", message: "Be kind to yourself: steady practice can grow your confidence and your score." };
  return { percentage, band, mood };
}

export function GoalPlanner() {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [step, setStep] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const resultHeadingRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const otherCity = data.city === "__other__";
  const selectedCity = otherCity ? data.otherCity.trim() : data.city;
  const region = otherCity ? data.otherRegion : cities.find(([city]) => city === data.city)?.[1] ?? "";
  const result = useMemo(() => estimate(data), [data]);
  useEffect(() => {
    if (resultVisible) resultHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultVisible]);
  const update = (key: keyof PlannerData, value: string) => { setData((current) => ({ ...current, [key]: value })); setError(""); };
  const values = [data.stream, selectedCity && region, data.examYear, data.hours];
  const next = () => {
    if (!values[step]) { setError("Choose an option to continue."); return; }
    setError("");
    if (step === steps.length - 1) setResultVisible(true);
    else setStep((current) => current + 1);
  };
  const back = () => { setError(""); if (resultVisible) setResultVisible(false); else setStep((current) => Math.max(0, current - 1)); };
  const reset = () => { setData(initialData); setStep(0); setError(""); setResultVisible(false); };
  const continueToSignup = () => {
    try { sessionStorage.setItem("deborah_goal_planner_draft", JSON.stringify({ stream: data.stream, city: selectedCity, region, examYear: Number(data.examYear), dailyStudyHours: Number(data.hours) })); } catch { /* Continue to signup even if storage is unavailable. */ }
    router.push("/login?source=goal-planner");
  };

  return <main className="relative flex min-h-dvh items-start justify-center overflow-x-hidden bg-background px-3 py-4 sm:px-6 sm:py-6 lg:items-center">
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    <section className="relative grid w-full max-w-5xl min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(12,67,44,.16)] sm:rounded-[1.75rem] md:grid-cols-[0.85fr_1.15fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#176744] via-primary to-[#082f26] p-5 text-white sm:p-7 md:min-h-[500px] md:p-9">
        <div aria-hidden className="absolute -right-20 top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.06]" />
        <div aria-hidden className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative z-10"><Link href="/" className="text-xs font-bold text-white/75 transition hover:text-white">← Deborah home</Link>
          <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.15em] text-accent"><Target size={15} /> Grade 12 goal planner</p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Your goal.<br />Your next step.</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">One quick question at a time. Choose from the options—no typing needed.</p>
        </div>
        <div className="relative z-10 mt-5 hidden rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur md:block"><Sparkles size={18} className="text-accent" /><p className="mt-2 text-sm font-bold">Progress is built one day at a time.</p></div>
      </div>
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7 md:p-9">
        {!resultVisible ? <>
          <div className="mb-6"><div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-bold text-muted"><span>Question {step + 1} of {steps.length}</span><span>{steps[step]}</span></div><div role="progressbar" aria-label="Planner progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-valuetext={`Question ${step + 1} of ${steps.length}: ${steps[step]}`} className="flex gap-2">{steps.map((label, i) => <div key={label} aria-hidden="true" className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}</div></div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Let’s make a plan</p>
          <h2 id="planner-question" className="mt-1 text-xl font-black leading-snug text-primary sm:text-2xl">{["Which stream are you preparing for?", "Which city do you study in?", "When is your exam?", "How much can you study each day?"][step]}</h2>
          {step === 0 && <label className="mt-5 block text-xs font-bold text-muted">Study stream<select autoFocus className={selectClass} value={data.stream} onChange={(e) => update("stream", e.target.value)}><option value="">Select a stream</option><option value="natural">Natural Science</option><option value="social">Social Science</option></select></label>}
          {step === 1 && <><label className="mt-5 block text-xs font-bold text-muted">City<select autoFocus className={selectClass} value={data.city} onChange={(e) => update("city", e.target.value)}><option value="">Select your city</option>{cities.map(([city]) => <option key={city} value={city}>{city}</option>)}<option value="__other__">Other city…</option></select></label>{otherCity ? <><label className="mt-3 block text-xs font-bold text-muted">Enter your city<input className={selectClass} value={data.otherCity} onChange={(e) => update("otherCity", e.target.value)} placeholder="Type your city" /></label><label className="mt-3 block text-xs font-bold text-muted">Region<select className={selectClass} value={data.otherRegion} onChange={(e) => update("otherRegion", e.target.value)}><option value="">Select your region</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label></> : <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3.5 py-3 text-xs"><span className="font-bold text-muted">Region</span><span className="font-bold text-primary">{region || "Filled in from your city"}</span></div>}</>}
          {step === 2 && <><label className="mt-5 block text-xs font-bold text-muted">Exam year<select autoFocus className={selectClass} value={data.examYear} onChange={(e) => update("examYear", e.target.value)}><option value="">Select exam year</option>{Array.from({ length: 10 }, (_, i) => currentEthiopianYear() + i).map((year) => <option key={year} value={year}>{year} E.C.</option>)}</select></label><p className="mt-2 text-xs text-muted">The current Ethiopian calendar year is {currentEthiopianYear()} E.C.</p></>}
          {step === 3 && <label className="mt-5 block text-xs font-bold text-muted">Study time each day<select autoFocus className={selectClass} value={data.hours} onChange={(e) => update("hours", e.target.value)}><option value="">Choose daily study time</option>{hoursOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-error">{error}</p>}
          <div className="mt-7 flex gap-3"><button type="button" onClick={back} disabled={step === 0} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background disabled:invisible"><ArrowLeft size={16} /> Back</button><button type="button" onClick={next} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary-light">{step === steps.length - 1 ? "See my estimate" : "Continue"}<ArrowRight size={17} /></button></div>
          <p className="mt-4 text-center text-[11px] text-muted">A friendly planning guide—not an official exam prediction.</p>
        </> : <>
          <div ref={resultHeadingRef} className="planner-result-enter scroll-mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary"><Sparkles size={15} className="text-accent" /> Your starting estimate</div>
          <div className="mt-4 rounded-2xl bg-primary p-5 text-white sm:p-6"><p className="text-5xl font-black tracking-tight text-accent">{result.percentage}%</p><p className="mt-1 text-sm font-semibold">estimated chance of reaching {result.band}+ out of 600</p><div role="progressbar" aria-label="Estimated likelihood" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.percentage} aria-valuetext={`${result.percentage}% estimated chance of reaching ${result.band}+ out of 600`} className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div aria-hidden="true" className="h-full rounded-full bg-accent transition-all motion-reduce:transition-none" style={{ width: `${result.percentage}%` }} /></div></div>
          <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4"><p className="text-2xl" aria-hidden="true">{result.mood.face}</p><h2 className="mt-1 text-lg font-black text-primary">{result.mood.headline}</h2><p className="mt-1 text-sm leading-5 text-muted">{result.mood.message}</p></div>
          <p className="mt-4 text-xs leading-5 text-muted">This is a starting-point estimate, not a guarantee. Your stream, {data.hours} study hour{data.hours === "1" ? "" : "s"}/day and {data.examYear} E.C. exam help shape your plan. Your potential is not defined by a number.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={back} className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background"><ArrowLeft size={15} /> Review answers</button><button type="button" onClick={continueToSignup} className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-center text-sm font-black text-white hover:bg-primary-light">Save my plan & start free <ArrowRight size={15} /></button></div>
          <button type="button" onClick={reset} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold text-muted hover:text-primary"><RotateCcw size={13} /> Start over</button>
          <section aria-labelledby="student-spotlight-title" className="mt-6 min-w-0 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#102b44] via-[#132f4c] to-[#0b243a] p-4 text-white shadow-lg sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-200">Real student achievement</p><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/75">Shared with permission</span></div>
            <div className="mt-4 grid min-w-0 items-center gap-4 sm:grid-cols-[110px_minmax(0,1fr)]">
              <img src="/images/gosa-negeso-geletto-result.jpg" alt="Gosa Negeso Geletto’s result card showing a score of 589 out of 600" className="mx-auto max-h-48 w-auto max-w-full rounded-xl border border-white/15 object-contain shadow-md sm:mx-0" />
              <div className="min-w-0 break-words"><h2 id="student-spotlight-title" className="text-lg font-black leading-tight sm:text-xl">Gosa Negeso Geletto</h2><p className="mt-1 text-sm font-semibold text-cyan-200">589 / 600 · Natural Science</p><blockquote className="mt-3 rounded-xl border-l-2 border-cyan-200 bg-white/[0.06] p-3 text-sm leading-6 text-white/85">“Good study materials and practice questions can help students prepare better.”</blockquote><p className="mt-2 text-xs font-bold text-cyan-100">— Gosa</p></div>
            </div>
          </section>
          <section aria-labelledby="deborah-help-title" className="mt-6 border-t border-border pt-5">
            <h2 id="deborah-help-title" className="text-lg font-black text-primary">Turn your goal into a routine</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Study a topic, practise questions, and use your progress to decide what to work on next.</p>
            <p className="mt-3 rounded-xl bg-background p-3 text-xs leading-5 text-muted">Your estimate is only a starting point—not a promise. Consistent practice matters more than one number.</p>
          </section>
        </>}
      </div>
    </section>
  </main>;
}
