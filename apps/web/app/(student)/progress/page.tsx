"use client";
import { DEMO } from "../../../lib/config";
import { LiveProgress } from "../../../features/live/Learn";
import { Card, PageHeader } from "../../../components/ui";
import { BarChart, LineChart } from "../../../components/Charts";
import { useStore } from "../../../lib/store";
import { subjectStats, topicStats, events, streak } from "../../../lib/analytics";
function DemoP() {
  const { state } = useStore(); const ev = events(state); const c = ev.filter((e) => e.correct).length; const subs = subjectStats(state); const ts = topicStats(state).filter((t) => t.attempted);
  const days = [...new Set(state.days)].slice(-14); const premium = state.user!.plan === "PREMIUM";
  const trend = state.attempts.map((a, i) => ({ label: `#${i + 1}`, value: Math.round(a.result.percentage) })); const mocks = state.attempts.filter((a) => a.type === "MOCK");
  const acc = ev.length ? Math.round((c / ev.length) * 100) : 0; const avg = state.attempts.length ? Math.round(state.attempts.reduce((n, a) => n + a.result.percentage, 0) / state.attempts.length) : 0;
  return <><PageHeader title="Progress" sub="How you are doing across practice and exams." />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Attempted", ev.length], ["Correct", c], ["Incorrect", ev.length - c], ["Accuracy", `${acc}%`], ["Avg exam score", `${avg}%`], ["Exams", state.attempts.length], ["Notes done", state.notesDone.length], ["Streak", `${streak(state.days)}d`], ["AI messages", Object.values(state.aiUsage).reduce((a, b) => a + b, 0)], ["Study days", state.days.length]].map(([l, v]) => <Card key={String(l)} className="!p-4 text-center"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">Exam scores over time</h2><LineChart label="Exam scores over time" data={trend} /></Card>
      <Card><h2 className="mb-3 font-bold">Subject performance</h2><BarChart label="Subject performance" data={subs.filter((s) => s.accuracy != null).map((s) => ({ label: s.name, value: s.accuracy!, color: s.color }))} /></Card>
      <Card><h2 className="mb-3 font-bold">Topic performance</h2>{premium ? <BarChart label="Topic performance" data={ts.map((t) => ({ label: t.topicName, value: Math.round((t.correct / t.attempted) * 100) }))} /> : <p className="text-sm text-muted">Detailed topic analytics are part of Premium. <a href="/pricing" className="underline">See plans</a></p>}</Card>
      <Card><h2 className="mb-3 font-bold">Mock exam performance</h2><LineChart label="Mock exam scores" data={mocks.map((a, i) => ({ label: `Mock ${i + 1}`, value: Math.round(a.result.percentage) }))} /></Card>
      <Card className="md:col-span-2"><h2 className="font-bold">Study consistency</h2><p className="mt-1 text-sm text-muted">{days.length} active day(s) recently. Rest days are healthy — steady beats exhausting.</p><div className="mt-3 flex flex-wrap gap-1.5" aria-label="Recent active days">{days.map((d) => <span key={d} title={d} className="h-6 w-6 rounded bg-primary" />)}{!days.length && <span className="text-sm text-muted">No study days yet.</span>}</div></Card></div></>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveProgress />; }
