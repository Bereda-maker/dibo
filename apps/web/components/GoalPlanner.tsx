"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, ClipboardCheck, RotateCcw, Sparkles, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

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
  const band = percentage >= 82 ? "550+" : percentage >= 70 ? "500+" : percentage >= 56 ? "450+" : percentage >= 36 ? "400+" : "300+";
  const mood = percentage >= 70 ? { face: "🌟", headline: "You’ve got this!", message: "Your ambition is shining—keep showing up, one focused day at a time." } : percentage >= 45 ? { face: "💪", headline: "A strong start is yours.", message: "You’re building momentum. Every study session brings your goal closer." } : { face: "🌱", headline: "Every big goal starts small.", message: "Be kind to yourself: steady practice can grow your confidence and your score." };
  return { percentage, band, mood };
}

export function GoalPlanner() {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [step, setStep] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [error, setError] = useState("");
  const otherCity = data.city === "__other__";
  const selectedCity = otherCity ? data.otherCity.trim() : data.city;
  const region = otherCity ? data.otherRegion : cities.find(([city]) => city === data.city)?.[1] ?? "";
  const result = useMemo(() => estimate(data), [data]);
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

  return <main className={`relative flex justify-center bg-background px-3 py-3 sm:px-6 sm:py-4 ${resultVisible ? "min-h-dvh items-start overflow-y-auto" : "h-dvh items-center overflow-hidden"}`}>
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    <section className={`relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_24px_80px_rgba(12,67,44,.16)] md:grid-cols-[0.85fr_1.15fr] ${resultVisible ? "my-2 sm:my-4" : ""}`}>
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
      <div className="flex flex-col justify-center p-5 sm:p-7 md:p-9">
        {!resultVisible ? <>
          <div className="mb-6"><div className="mb-3 flex items-center justify-between text-xs font-bold text-muted"><span>Question {step + 1} of {steps.length}</span><span>{steps[step]}</span></div><div className="flex gap-2" aria-label="Progress">{steps.map((label, i) => <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}</div></div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Let’s make a plan</p>
          <h2 className="mt-1 text-2xl font-black text-primary">{["Which stream are you preparing for?", "Which city do you study in?", "When is your exam?", "How much can you study each day?"][step]}</h2>
          {step === 0 && <label className="mt-5 block text-xs font-bold text-muted">Study stream<select autoFocus className={selectClass} value={data.stream} onChange={(e) => update("stream", e.target.value)}><option value="">Select a stream</option><option value="natural">Natural Science</option><option value="social">Social Science</option></select></label>}
          {step === 1 && <><label className="mt-5 block text-xs font-bold text-muted">City<select autoFocus className={selectClass} value={data.city} onChange={(e) => update("city", e.target.value)}><option value="">Select your city</option>{cities.map(([city]) => <option key={city} value={city}>{city}</option>)}<option value="__other__">Other city…</option></select></label>{otherCity ? <><label className="mt-3 block text-xs font-bold text-muted">Enter your city<input className={selectClass} value={data.otherCity} onChange={(e) => update("otherCity", e.target.value)} placeholder="Type your city" /></label><label className="mt-3 block text-xs font-bold text-muted">Region<select className={selectClass} value={data.otherRegion} onChange={(e) => update("otherRegion", e.target.value)}><option value="">Select your region</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label></> : <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3.5 py-3 text-xs"><span className="font-bold text-muted">Region</span><span className="font-bold text-primary">{region || "Filled in from your city"}</span></div>}</>}
          {step === 2 && <><label className="mt-5 block text-xs font-bold text-muted">Exam year<select autoFocus className={selectClass} value={data.examYear} onChange={(e) => update("examYear", e.target.value)}><option value="">Select exam year</option>{Array.from({ length: 10 }, (_, i) => currentEthiopianYear() + i).map((year) => <option key={year} value={year}>{year} E.C.</option>)}</select></label><p className="mt-2 text-xs text-muted">The current Ethiopian calendar year is {currentEthiopianYear()} E.C.</p></>}
          {step === 3 && <label className="mt-5 block text-xs font-bold text-muted">Study time each day<select autoFocus className={selectClass} value={data.hours} onChange={(e) => update("hours", e.target.value)}><option value="">Choose daily study time</option>{hoursOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-error">{error}</p>}
          <div className="mt-7 flex gap-3"><button type="button" onClick={back} disabled={step === 0} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background disabled:invisible"><ArrowLeft size={16} /> Back</button><button type="button" onClick={next} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary-light">{step === steps.length - 1 ? "See my estimate" : "Continue"}<ArrowRight size={17} /></button></div>
          <p className="mt-4 text-center text-[11px] text-muted">A friendly planning guide—not an official exam prediction.</p>
        </> : <>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary"><Sparkles size={15} className="text-accent" /> Your starting estimate</div>
          <div className="mt-4 rounded-2xl bg-primary p-5 text-white sm:p-6"><p className="text-5xl font-black tracking-tight text-accent">{result.percentage}%</p><p className="mt-1 text-sm font-semibold">estimated chance of reaching {result.band}+ out of 600</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${result.percentage}%` }} /></div></div>
          <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4"><p className="text-2xl" aria-hidden="true">{result.mood.face}</p><h2 className="mt-1 text-lg font-black text-primary">{result.mood.headline}</h2><p className="mt-1 text-sm leading-5 text-muted">{result.mood.message}</p></div>
          <p className="mt-4 text-xs leading-5 text-muted">This is a starting-point estimate, not a guarantee. Your stream, {data.hours} study hour{data.hours === "1" ? "" : "s"}/day and {data.examYear} E.C. exam help shape your plan. Your potential is not defined by a number.</p>
          <p className="mt-4 rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5 text-xs font-semibold text-primary">Free student account · Your answers will be saved to your profile</p>
          <div className="mt-5 flex gap-3"><button type="button" onClick={back} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background"><ArrowLeft size={15} /> Review answers</button><button type="button" onClick={continueToSignup} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white hover:bg-primary-light">Save my plan & start free <ArrowRight size={15} /></button></div>
          <button type="button" onClick={reset} className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-bold text-muted hover:text-primary"><RotateCcw size={13} /> Start over</button>
          <section aria-labelledby="student-spotlight-title" className="mt-7 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#102b44] via-[#132f4c] to-[#0b243a] p-4 text-white shadow-lg sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-200">Student result spotlight</p><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/75">Shared with permission</span></div>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[120px_1fr]">
              <img src="/images/gishe-chuluke-hade-result.jpg" alt="Full student result card for GISHE CHULUKE HADE, including school, admission number, and total score of 516" className="mx-auto max-h-64 w-auto rounded-xl border border-white/15 object-contain shadow-md sm:mx-0" />
              <div><h2 id="student-spotlight-title" className="text-lg font-black leading-tight sm:text-xl">GISHE CHULUKE HADE</h2><p className="mt-2 text-sm leading-6 text-white/75">A score to celebrate: <strong className="text-cyan-200">516 / 600</strong>.</p><dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs leading-5 text-white/75"><dt className="font-bold text-white/55">School</dt><dd>IFA BORU DODOLA SP. BOARDING</dd><dt className="font-bold text-white/55">Admission No.</dt><dd>8670852</dd><dt className="font-bold text-white/55">Stream</dt><dd>Social Science</dd><dt className="font-bold text-white/55">Sex</dt><dd>M</dd><dt className="font-bold text-white/55">Age</dt><dd>Not listed on the result</dd></dl><blockquote className="mt-4 rounded-xl border-l-2 border-cyan-200 bg-white/[0.06] p-3 text-sm leading-6 text-white/85">“After reviewing Deborah, I genuinely believe it has the potential to make a big difference for Grade 12 students in Ethiopia. Preparing for the national exam requires dedication, good study materials, and plenty of practice, and Deborah brings these important resources together in one platform. I am really impressed by this initiative, and I encourage the team behind Deborah to keep going. What they are building is meaningful for the future of education in Ethiopia.”</blockquote><p className="mt-2 text-xs font-bold text-cyan-100">— Gishe Chuluke Hade</p><p className="mt-3 text-xs leading-5 text-white/60">Every student’s path is different. This shared achievement is not a promise of results.</p></div>
            </div>
          </section>
          <section aria-labelledby="gosa-testimonial-title" className="mt-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#102b44] via-[#132f4c] to-[#0b243a] p-4 text-white shadow-lg sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-200">Student testimony</p><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/75">Shared with permission</span></div>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[150px_1fr]">
              <img src="/images/gosa-negeso-geletto-result.jpg" alt="Gosa Negeso Geletto’s result card showing his photo, name, score of 589, admission number, Natural Science stream, and sex" className="mx-auto max-h-56 w-auto rounded-xl border border-white/15 object-contain shadow-md sm:mx-0" />
              <div><h2 id="gosa-testimonial-title" className="text-lg font-black leading-tight sm:text-xl">GOSA NEGESO GELETTO</h2><p className="mt-1 text-sm font-semibold text-cyan-200">Result shared: 589 / 600</p><dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs leading-5 text-white/75"><dt className="font-bold text-white/55">Admission No.</dt><dd>870853</dd><dt className="font-bold text-white/55">Stream</dt><dd>Natural Science</dd><dt className="font-bold text-white/55">Sex</dt><dd>M</dd></dl><blockquote className="mt-3 rounded-xl border-l-2 border-cyan-200 bg-white/[0.06] p-3 text-sm leading-6 text-white/85">“As a student who recently prepared for the Grade 12 national exam, I know how important it is to have good study materials. I had a chance to review Deborah, and I like the idea of having practice questions and learning resources in one place. I think Deborah has great potential to help students prepare better.”</blockquote><p className="mt-2 text-xs font-bold text-cyan-100">— Gosa Negeso Geletto</p><p className="mt-3 text-xs leading-5 text-white/60">School information is omitted from this public spotlight.</p></div>
            </div>
          </section>
          <section aria-label="Start learning with Deborah" className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-primary/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-black text-primary">Ready to make your own study plan?</h2><p className="mt-1 text-xs text-muted">Save your answers and start learning with Deborah for free.</p></div>
            <button type="button" onClick={continueToSignup} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white shadow-sm transition hover:bg-primary-light">Create my free account <ArrowRight size={16} /></button>
          </section>
          <section aria-labelledby="deborah-help-title" className="mt-7 border-t border-border pt-6">
            <p className="text-xs font-black uppercase tracking-wider text-primary">Your preparation, supported</p>
            <h2 id="deborah-help-title" className="mt-1 text-xl font-black text-primary">How Deborah helps you move forward</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Turn a big exam goal into a clear routine with learning tools designed for Ethiopian Grade 12 students.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-border bg-background p-4"><BookOpenCheck size={19} className="text-primary" /><h3 className="mt-3 text-sm font-black text-primary">Learn with clarity</h3><p className="mt-1 text-xs leading-5 text-muted">Review organized notes and get learning support when a topic feels difficult.</p></article>
              <article className="rounded-2xl border border-border bg-background p-4"><ClipboardCheck size={19} className="text-primary" /><h3 className="mt-3 text-sm font-black text-primary">Practise with purpose</h3><p className="mt-1 text-xs leading-5 text-muted">Try topic questions and quizzes, revisit mistakes, and build exam confidence.</p></article>
              <article className="rounded-2xl border border-border bg-background p-4"><TrendingUp size={19} className="text-primary" /><h3 className="mt-3 text-sm font-black text-primary">See your progress</h3><p className="mt-1 text-xs leading-5 text-muted">Use progress insights to notice your strengths and choose what to work on next.</p></article>
            </div>
            <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4"><h3 className="text-sm font-black text-primary">A few ways to get more from Deborah</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted"><li><strong className="text-primary">Set one small goal:</strong> choose a topic and a realistic study session for today.</li><li><strong className="text-primary">Learn, then practise:</strong> review the notes first, then try questions without looking at the answers.</li><li><strong className="text-primary">Treat mistakes as clues:</strong> read explanations and revisit missed questions later.</li><li><strong className="text-primary">Build a steady rhythm:</strong> check your progress regularly and adjust your plan instead of cramming.</li></ul></div>
            <p className="mt-4 rounded-xl bg-background p-3 text-xs leading-5 text-muted">Small, consistent study sessions add up. Use your estimate as a starting point, then focus on learning and practice—not pressure.</p>
          </section>
        </>}
      </div>
    </section>
  </main>;
}
