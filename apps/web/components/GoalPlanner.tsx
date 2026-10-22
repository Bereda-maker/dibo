"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2, Clock3, RotateCcw, Sparkles, Target, TrendingUp } from "lucide-react";

type PlannerData = { stream: string; city: string; otherCity: string; otherRegion: string; examYear: string; hours: string };
type StudyTask = { id: string; day: string; subject: string; title: string; duration: number; kind: "Learn" | "Practice" | "Review" };
type SavedPlan = { data: PlannerData; tasks: StudyTask[]; completed: string[]; updatedAt: string };
const STORAGE_KEY = "deborah_goal_planner_v2";
const initialData: PlannerData = { stream: "", city: "", otherCity: "", otherRegion: "", examYear: "", hours: "" };
const steps = ["Study stream", "Your city", "Exam year", "Daily study time"];
const cities = [["Addis Ababa", "Addis Ababa"], ["Dire Dawa", "Dire Dawa"], ["Bahir Dar", "Amhara"], ["Gondar", "Amhara"], ["Dessie", "Amhara"], ["Debre Markos", "Amhara"], ["Mekelle", "Tigray"], ["Adigrat", "Tigray"], ["Adama", "Oromia"], ["Jimma", "Oromia"], ["Hawassa", "Sidama"], ["Dilla", "Sidama"], ["Jijiga", "Somali"], ["Harar", "Harari"], ["Semera", "Afar"], ["Assosa", "Benishangul-Gumuz"], ["Gambela", "Gambela"], ["Sodo", "South Ethiopia"], ["Wolaita Sodo", "South Ethiopia"], ["Bonga", "South West Ethiopia"], ["Hosaena", "Central Ethiopia"]] as const;
const hoursOptions = [["1", "Up to 1 hour"], ["2", "2 hours"], ["4", "3–4 hours"], ["6", "5–6 hours"], ["8", "7+ hours"]];
const regions = ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray"];
const selectClass = "mt-2 h-12 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
function currentEthiopianYear() { const now = new Date(); return now.getFullYear() - (now >= new Date(now.getFullYear(), 8, 11) ? 7 : 8); }
function subjectsFor(stream: string) { return stream === "natural" ? ["Mathematics", "Physics", "Chemistry", "Biology", "English"] : ["Mathematics", "Economics", "History", "Geography", "English"]; }
function dailyBudget(hours: string) { const n = Number(hours); return n === 1 ? 50 : n === 2 ? 75 : n === 4 ? 105 : n === 6 ? 135 : 150; }
function buildTasks(data: PlannerData): StudyTask[] {
  const budget = dailyBudget(data.hours);
  const firstDuration = Math.round(budget * 2 / 3);
  const secondDuration = budget - firstDuration;
  const subjects = subjectsFor(data.stream);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const kinds: StudyTask["kind"][] = ["Learn", "Practice", "Learn", "Practice", "Review", "Practice"];
  return days.flatMap((day, i) => {
    if (i === 6) return [{ id: "sun-rest", day, subject: "Rest & reset", title: "Take a full rest day. A short, optional look at your weekly notes is enough.", duration: 0, kind: "Review" as const }];
    const subject = subjects[(i + (data.stream === "natural" ? 1 : 0)) % subjects.length]!;
    const nextSubject = subjects[(i + 2) % subjects.length]!;
    const kind = kinds[i] ?? "Review";
    const title = kind === "Learn" ? `Choose one topic from your ${subject} notes. Read actively, then write 3 key ideas from memory.` : kind === "Practice" ? `Answer 8–10 ${subject} practice questions without notes. Check each answer and note one mistake to revisit.` : `Review this week's ${subject} notes and redo 3 questions you found difficult.`;
    return [
      { id: `d${i}-a`, day, subject, title, duration: firstDuration, kind },
      { id: `d${i}-b`, day, subject: nextSubject, title: `Spend ${secondDuration} minutes recalling ${nextSubject}: list what you remember, then check your notes and correct gaps.`, duration: secondDuration, kind: "Review" as const },
    ];
  });
}
function weeklyHours(value: string) { return Math.round(dailyBudget(value) * 6 / 60 * 10) / 10; }
export function GoalPlanner() {
  const router = useRouter();
  const [data, setData] = useState<PlannerData>(initialData);
  const [step, setStep] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedPlan | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const p = JSON.parse(raw) as SavedPlan; if (p?.data && Array.isArray(p.tasks) && Array.isArray(p.completed)) { setSaved(p); setData(p.data); setResultVisible(true); } } } catch { setNotice("Your previous plan could not be read. You can create a new one."); } }, []);
  const otherCity = data.city === "__other__";
  const selectedCity = otherCity ? data.otherCity.trim() : data.city;
  const region = otherCity ? data.otherRegion : cities.find(([city]) => city === data.city)?.[1] ?? "";
  const tasks = useMemo(() => buildTasks(data), [data]);
  const completed = saved?.completed ?? [];
  const progress = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;
  const update = (key: keyof PlannerData, value: string) => { setData((current) => ({ ...current, [key]: value })); setError(""); };
  const values = [data.stream, selectedCity && region, data.examYear, data.hours];
  const next = () => {
    if (!values[step]) { setError("Choose an option to continue."); return; }
    setError("");
    if (step === 3) {
      const plan: SavedPlan = { data, tasks: buildTasks(data), completed: [], updatedAt: new Date().toISOString() };
      setSaved(plan); setResultVisible(true);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); setNotice("Your study plan is saved on this device."); }
      catch { setNotice("Plan created, but this browser could not save it. Keep this page open to continue."); }
    } else setStep((n) => n + 1);
  };
  const back = () => { setError(""); if (resultVisible) { setResultVisible(false); setStep(3); } else setStep((n) => Math.max(0, n - 1)); };
  const editPlan = () => { setData(saved?.data ?? data); setStep(0); setResultVisible(false); setError(""); };
  const startOver = () => { setData(initialData); setStep(0); setError(""); setResultVisible(false); setSaved(null); setNotice(""); try { localStorage.removeItem(STORAGE_KEY); } catch { /* Local storage is optional. */ } };
  const toggleTask = (id: string) => {
    const current = saved ?? { data, tasks, completed: [], updatedAt: new Date().toISOString() };
    const checked = current.completed.includes(id) ? current.completed.filter((x) => x !== id) : [...current.completed, id];
    const plan = { ...current, tasks, completed: checked, updatedAt: new Date().toISOString() };
    setSaved(plan);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); setNotice("Progress saved on this device."); }
    catch { setNotice("Progress updated for this visit, but this browser could not save it."); }
  };
  const continueToSignup = () => { try { sessionStorage.setItem("deborah_goal_planner_draft", JSON.stringify({ stream: data.stream, city: selectedCity, region, examYear: Number(data.examYear), dailyStudyHours: Number(data.hours) })); } catch { /* Continue to signup if session storage is blocked. */ } router.push("/login?source=goal-planner"); };
  return <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm font-bold text-primary hover:underline">← Deborah home</Link><span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-primary"><Target size={15}/>Grade 12 goal planner</span></header>
    {!resultVisible ? <section className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_20px_60px_rgba(12,67,44,.12)] md:grid-cols-[.8fr_1.2fr]">
      <aside className="flex flex-col justify-between bg-gradient-to-br from-[#176744] via-primary to-[#082f26] p-6 text-white sm:p-9"><div><p className="text-xs font-black uppercase tracking-[.16em] text-accent">Make a plan that fits you</p><h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Your goal.<br/>Your next step.</h1><p className="mt-3 max-w-sm text-sm leading-6 text-white/80">A realistic weekly routine, built around the time you have. No score predictions—just clear steps you can take.</p></div><div className="mt-8 rounded-2xl border border-white/15 bg-white/[.07] p-4"><Sparkles size={18} className="text-accent"/><p className="mt-2 text-sm font-bold">Progress is built one day at a time.</p><p className="mt-1 text-xs text-white/70">Short, focused sessions with breaks are easier to sustain.</p></div></aside>
      <div className="p-5 sm:p-9"><div className="mb-7" role="group" aria-label={`Step ${step + 1} of 4`}><div className="mb-3 flex items-center justify-between text-xs font-bold text-muted"><span>Step {step + 1} of 4</span><span>{steps[step]}</span></div><div className="flex gap-2" aria-hidden="true">{steps.map((label, i) => <div key={label} className={`h-1.5 flex-1 rounded-full transition-colors motion-reduce:transition-none ${i <= step ? "bg-primary" : "bg-border"}`}/>)}</div></div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Let's make a plan</p><h2 className="mt-1 text-2xl font-black text-primary">{["Which stream are you preparing for?", "Which city do you study in?", "When is your exam?", "How much can you study each day?"][step]}</h2><p className="mt-2 text-sm leading-6 text-muted">{["This helps us choose relevant subjects for your weekly routine.", "Your city is only used for your student profile; it does not affect your study schedule.", "We’ll use your timeframe to keep the plan focused and manageable.", "We’ll spread sessions across the week and include a full rest day."][step]}</p>
        {step === 0 && <label className="mt-5 block text-xs font-bold text-muted">Study stream<select autoFocus className={selectClass} value={data.stream} onChange={(e) => update("stream", e.target.value)}><option value="">Select a stream</option><option value="natural">Natural Science</option><option value="social">Social Science</option></select></label>}
        {step === 1 && <><label className="mt-5 block text-xs font-bold text-muted">City<select autoFocus className={selectClass} value={data.city} onChange={(e) => update("city", e.target.value)}><option value="">Select your city</option>{cities.map(([city]) => <option key={city} value={city}>{city}</option>)}<option value="__other__">Other city…</option></select></label>{otherCity ? <><label className="mt-3 block text-xs font-bold text-muted">Enter your city<input className={selectClass} value={data.otherCity} onChange={(e) => update("otherCity", e.target.value)} placeholder="Type your city"/></label><label className="mt-3 block text-xs font-bold text-muted">Region<select className={selectClass} value={data.otherRegion} onChange={(e) => update("otherRegion", e.target.value)}><option value="">Select your region</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label></> : <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3.5 py-3 text-xs"><span className="font-bold text-muted">Region</span><span className="font-bold text-primary">{region || "Filled in from your city"}</span></div>}</>}
        {step === 2 && <><label className="mt-5 block text-xs font-bold text-muted">Exam year<select autoFocus className={selectClass} value={data.examYear} onChange={(e) => update("examYear", e.target.value)}><option value="">Select exam year</option>{Array.from({ length: 10 }, (_, i) => currentEthiopianYear() + i).map((year) => <option key={year} value={year}>{year} E.C.</option>)}</select></label><p className="mt-2 text-xs text-muted">Current Ethiopian calendar year: {currentEthiopianYear()} E.C.</p></>}
        {step === 3 && <label className="mt-5 block text-xs font-bold text-muted">Study time each day<select autoFocus className={selectClass} value={data.hours} onChange={(e) => update("hours", e.target.value)}><option value="">Choose daily study time</option>{hoursOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-error">{error}</p>}<div className="mt-7 flex gap-3"><button type="button" onClick={back} disabled={step === 0} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:invisible"><ArrowLeft size={16}/>Back</button><button type="button" onClick={next} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{step === 3 ? "Build my weekly plan" : "Continue"}<ArrowRight size={17}/></button></div><p className="mt-4 text-center text-[11px] text-muted">A practical planning guide—not official academic advice or a score guarantee.</p>
      </div></section> : <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5"><div className="rounded-3xl bg-primary p-6 text-white sm:p-8"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-accent"><Sparkles size={16}/>Your weekly study plan</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">A steady path to your {data.examYear} E.C. exam</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{data.stream === "natural" ? "Natural Science" : "Social Science"} · {selectedCity || "Your city"} · About {weeklyHours(data.hours)} focused hours per week. Sessions are intentionally short, with one full rest day.</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={editPlan} className="min-h-11 rounded-xl border border-white/25 px-4 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Adjust answers</button><button onClick={continueToSignup} className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Save profile & create account <ArrowRight size={15} className="ml-1 inline"/></button></div></div>
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-primary">This week</h2><p className="mt-1 text-sm text-muted">Six focused days, then a full rest day.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-bold text-primary"><Clock3 size={14}/>{weeklyHours(data.hours)} hours planned</span></div><div className="mt-5 space-y-3">{tasks.map((task) => <article key={task.id} className={`rounded-xl border p-4 transition-colors ${completed.includes(task.id) ? "border-primary/20 bg-primary/[.04]" : "border-border bg-background"}`}><div className="flex items-start gap-3"><button type="button" onClick={() => toggleTask(task.id)} aria-label={`${completed.includes(task.id) ? "Mark incomplete" : "Mark complete"}: ${task.title}`} aria-pressed={completed.includes(task.id)} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${completed.includes(task.id) ? "border-primary bg-primary text-white" : "border-border bg-surface text-transparent hover:border-primary"}`}><Check size={15}/></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-primary">{task.day}</h3><span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">{task.kind}</span>{task.duration > 0 && <span className="text-xs text-muted">{task.duration} min</span>}</div><p className={`mt-1 text-sm leading-6 ${completed.includes(task.id) ? "text-muted line-through" : "text-text"}`}>{task.title}</p>{task.duration > 0 && <p className="mt-1 text-xs font-bold text-primary">{task.subject}</p>}</div></div></article>)}</div></section><p className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm leading-6 text-muted">Take a 5–10 minute break between sessions. If a day feels too full, move a task rather than cutting into sleep. These general activities are not linked to specific Deborah resources.</p>
      </div><aside className="space-y-4 lg:sticky lg:top-5"><section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-black text-primary">Your progress</h2><p className="mt-1 text-sm text-muted">Completed tasks this week</p><div className="mt-4 flex items-end justify-between"><span className="text-3xl font-black text-primary">{completed.length}<span className="text-base font-bold text-muted"> / {tasks.length}</span></span><span className="text-sm font-black text-primary">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Weekly task completion" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={completed.length}><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }}/></div><p className="mt-3 text-xs leading-5 text-muted">Progress counts checked-off tasks, not time on this page.</p></section>
        <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="flex items-center gap-2 font-black text-primary"><TrendingUp size={17}/>Subject rotation</h2><ul className="mt-3 space-y-2">{subjectsFor(data.stream).map((subject, i) => <li key={subject} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"><span className="font-semibold text-primary">{subject}</span><span className="text-xs text-muted">{i < 2 ? "Priority" : "Rotation"}</span></li>)}</ul><p className="mt-3 text-xs leading-5 text-muted">Use your current class notes and materials. Choose topics based on what your teacher has covered.</p></section>
        <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-primary"/><h2 className="font-black text-primary">Plan saved here</h2></div><p className="mt-2 text-sm leading-6 text-muted">Your plan and checked tasks are stored in this browser on this device. They are not synced to your Deborah account.</p><button type="button" onClick={startOver} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><RotateCcw size={15}/>Create a new plan</button></section></aside>
    </section>}
    {notice && <p role="status" className="mx-auto mt-4 max-w-5xl text-sm font-semibold text-primary">{notice}</p>}
    <footer className="mx-auto mt-8 max-w-5xl border-t border-border pt-4 text-xs leading-5 text-muted"><span className="inline-flex items-center gap-1.5 font-bold text-primary"><BookOpenCheck size={14}/>A practical study companion</span><p className="mt-1">Plans are suggestions, not official exam guidance. Keep a healthy routine, include breaks, and ask teachers when you need help.</p></footer>
  </div></main>;
}
