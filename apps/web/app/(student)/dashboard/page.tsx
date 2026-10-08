"use client";
import { DEMO } from "../../../lib/config";
import { LiveDashboard } from "../../../features/live/Learn";
import Link from "next/link";
import { Flame, Bell, ArrowRight } from "lucide-react";
import { recommend } from "@dibora/core/recommendation";
import { Badge, Button, Card, Progress, toneFor } from "../../../components/ui";
import { ReadinessCard } from "../../../components/ReadinessCard";
import { useStore } from "../../../lib/store";
import { subjectStats, topicStats, readinessFor, streak, events, unlocked } from "../../../lib/analytics";
import { ACHIEVEMENTS } from "../../../lib/mock";
import { explainChange } from "@dibora/core/readiness";

const completeness = (u: NonNullable<ReturnType<typeof useStore>["state"]["user"]>) => Math.round(([u.name, u.email, u.phone, u.school, u.region, u.city, u.stream, u.examYear, u.subjects.length].filter(Boolean).length / 9) * 100);
function DemoP() {
  const { state } = useStore(); const u = state.user!; const hour = new Date().getHours();
  const diag = state.attempts.some((a) => a.type === "DIAGNOSTIC"); const stats = topicStats(state); const subs = subjectStats(state);
  const rec = recommend(stats, 1)[0]; const r = readinessFor(state); const wk = readinessFor(state, Date.now() - 7 * 864e5); const ch = explainChange(wk, r);
  const ranked = stats.filter((t) => t.attempted >= 3).map((t) => ({ ...t, a: Math.round((t.correct / t.attempted) * 100) })).sort((a, b) => b.a - a.a);
  const done = [...unlocked(state)].length; const pc = completeness(u); const qn = events(state).length;
  return (<div className="space-y-5">
    <div><h1 className="text-2xl font-bold">{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, {u.name.split(" ")[0]} 👋</h1>
      <div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge tone="info">{u.learningStatus.replaceAll("_", " ")}</Badge><Badge tone={u.plan === "PREMIUM" ? "accent" : "muted"}>{u.plan}</Badge><span className="flex items-center gap-1 font-semibold"><Flame size={14} className="text-accent" aria-hidden />{streak(state.days)} day streak</span></div></div>
    {pc < 100 && <Card className="flex items-center justify-between gap-3 !p-4"><div className="flex-1"><p className="text-sm font-semibold">Profile {pc}% complete</p><Progress value={pc} label="Profile completion" /></div><Button href="/profile" variant="secondary">Complete</Button></Card>}
    {!diag ? <Card className="border-accent bg-accent/10"><h2 className="font-bold">Take your diagnostic assessment</h2><p className="mt-1 text-sm text-muted">12 questions, about 20 minutes. We will find your strong and weak topics and build your first study plan.</p><Button href="/diagnostic" className="mt-3">Start assessment <ArrowRight size={16} /></Button></Card> :
      <Card className="border-primary bg-primary/5"><p className="text-sm text-muted">Your next recommended activity</p>{rec ? <><p className="mt-1 text-lg font-bold">{rec.reason}</p><p className="mt-1 text-sm">{rec.action === "READ_NOTE" ? "Read the short note first." : `Practice ${rec.questionCount} ${rec.difficulty.toLowerCase()} questions.`} <Badge tone={rec.priority === "HIGH" ? "error" : rec.priority === "MEDIUM" ? "warning" : "muted"}>{rec.priority}</Badge></p>
        <Button className="mt-3" href={rec.action === "READ_NOTE" ? "/notes" : `/practice?topic=${rec.topicId}&difficulty=${rec.difficulty}`}>{rec.action === "READ_NOTE" ? "Open notes" : "Start Practice"}</Button></> : <p className="mt-1">Keep practicing to unlock a personalised recommendation.</p>}</Card>}
    <div className="grid gap-4 md:grid-cols-2"><div><ReadinessCard overall={r.overall} parts={r.parts} delta={ch.delta} /><p className="mt-2 text-xs text-muted">{ch.text}</p></div>
      <Card><h2 className="font-bold">Subject performance</h2><ul className="mt-3 space-y-3">{subs.map((s) => <li key={s.id}><div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span className="font-semibold">{s.accuracy == null ? "—" : `${s.accuracy}%`}</span></div><Progress value={s.accuracy ?? 0} tone={toneFor(s.accuracy)} label={s.name} /></li>)}</ul></Card></div>
    <div className="grid gap-4 sm:grid-cols-2"><Card><h2 className="font-bold">Strong areas</h2><p className="mt-2 text-sm text-muted">{ranked.filter((t) => t.a >= 70).slice(0, 3).map((t) => `${t.topicName} ${t.a}%`).join(" · ") || "Practice more to find your strengths."}</p></Card>
      <Card><h2 className="font-bold">Weak areas</h2><p className="mt-2 text-sm text-muted">{ranked.filter((t) => t.a < 60).slice(-3).map((t) => `${t.topicName} ${t.a}%`).join(" · ") || "No weak areas flagged yet."}</p></Card></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Questions done", qn], ["Exams taken", state.attempts.length], ["Notes read", state.notesDone.length], ["Achievements", `${done}/${ACHIEVEMENTS.length}`]].map(([l, v]) => <Card key={String(l)} className="!p-4 text-center"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><Card><h2 className="font-bold">Recent exams</h2>{state.attempts.length ? <ul className="mt-2 space-y-2 text-sm">{[...state.attempts].reverse().slice(0, 3).map((a) => <li key={a.id} className="flex justify-between"><Link href={`/results/${a.id}`} className="underline">{a.title}</Link><b>{Math.round(a.result.percentage)}%</b></li>)}</ul> : <p className="mt-2 text-sm text-muted">No exams yet.</p>}</Card>
      <Card><h2 className="flex items-center gap-2 font-bold"><Bell size={16} aria-hidden />Notifications</h2><ul className="mt-2 space-y-1 text-sm text-muted"><li>{diag ? "Your latest results are ready." : "Diagnostic assessment available."}</li><li>Study reminder: 15 minutes today keeps your streak alive.</li></ul><Link href="/notifications" className="mt-2 inline-block text-sm text-primary underline">See all</Link></Card></div></div>); }

export default function Page() { return DEMO ? <DemoP /> : <LiveDashboard />; }
