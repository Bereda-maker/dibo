"use client";
import { DEMO } from "../../../lib/config";
import { LiveExams } from "../../../features/live/Exams";
import { Lock } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "../../../components/ui";
import { EXAMS, subjectName } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
function DemoP() {
  const { state } = useStore(); const prem = state.user?.plan === "PREMIUM";
  return <><PageHeader title="Exams" sub="Topic quizzes, subject tests and full mock examinations." />
    <div className="grid gap-4 sm:grid-cols-2">{EXAMS.map((e) => { const locked = e.premium && !prem; const best = Math.max(-1, ...state.attempts.filter((a) => a.examId === e.id).map((a) => a.result.percentage));
      return <Card key={e.id}><div className="flex items-center justify-between"><Badge tone={e.type === "MOCK" ? "accent" : "info"}>{e.type}</Badge>{locked && <Lock size={16} className="text-accent" aria-label="Premium" />}</div>
        <h2 className="mt-2 font-bold">{e.title}</h2><p className="text-sm text-muted">{e.description}</p><p className="mt-2 text-xs text-muted">{e.questionIds.length} questions · {e.minutes} min{e.subjectId ? ` · ${subjectName(e.subjectId)}` : ""}{best >= 0 ? ` · Best ${best}%` : ""}</p>
        <Button href={`/exams/${e.id}`} variant={locked ? "secondary" : "primary"} className="mt-3">{locked ? "Premium" : state.inProgress[e.id] ? "Continue" : "Start"}</Button></Card>; })}</div>
    {state.attempts.length > 0 && <><h2 className="mb-3 mt-8 text-lg font-bold">Recent results</h2><div className="space-y-2">{[...state.attempts].reverse().slice(0, 8).map((a) => <Card key={a.id} className="flex items-center justify-between !p-4"><div><p className="font-semibold">{a.title}</p><p className="text-xs text-muted">{new Date(a.submittedAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><span className="text-lg font-bold text-primary">{Math.round(a.result.percentage)}%</span><Button href={`/results/${a.id}`} variant="secondary">View</Button></div></Card>)}</div></>}</>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveExams />; }
