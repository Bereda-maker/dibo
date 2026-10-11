"use client";
import { DEMO } from "../../../lib/config";
import { ExamCatalog, LiveExams } from "../../../features/live/Exams";
import { Lock } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "../../../components/ui";
import { EXAMS, subjectName } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
function DemoP() {
  const { state } = useStore(); const prem = state.user?.plan === "PREMIUM";
  const rows = EXAMS.filter((e) => !e.subjectId || state.user?.subjects.includes(e.subjectId)).map((e) => { const locked = e.premium && !prem; const best = Math.max(-1, ...state.attempts.filter((a) => a.examId === e.id).map((a) => a.result.percentage)); return { id: e.id, type: e.type, title: e.title, description: e.description, minutes: e.minutes, questionCount: e.questionIds.length, passingScore: e.passing, locked, bestPercentage: best >= 0 ? best : null, inProgressAttemptId: state.inProgress[e.id] ? e.id : null, subjectId: e.subjectId ?? null, subjectName: e.subjectId ? subjectName(e.subjectId) : null }; });
  return <><PageHeader title="Exams" sub="A calmer way to move from subject practice to confident exam day." /><ExamCatalog rows={rows} />{state.attempts.length > 0 && <><h2 className="mb-3 mt-8 text-lg font-bold">Recent results</h2><div className="space-y-2">{[...state.attempts].reverse().slice(0, 8).map((a) => <Card key={a.id} className="flex items-center justify-between !p-4"><div><p className="font-semibold">{a.title}</p><p className="text-xs text-muted">{new Date(a.submittedAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><span className="text-lg font-bold text-primary">{Math.round(a.result.percentage)}%</span><Button href={`/results/${a.id}`} variant="secondary">View</Button></div></Card>)}</div></>}</>;
}
export default function Page() { return DEMO ? <DemoP /> : <LiveExams />; }
