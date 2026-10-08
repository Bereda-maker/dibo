"use client";
import { useParams } from "next/navigation";
import { recommend } from "@dibora/core/recommendation";
import { Badge, Button, Card, EmptyState, PageHeader } from "../../../../components/ui";
import { BarChart } from "../../../../components/Charts";
import { useStore } from "../../../../lib/store";
import { TOPICS, SUBJECTS, subjectName, topicName } from "../../../../lib/mock";
import { fmtTime } from "../../../../lib/exam";
import { topicStats } from "../../../../lib/analytics";

export default function P() {
  const { id } = useParams<{ id: string }>(); const { state } = useStore();
  const a = state.attempts.find((x) => x.id === id);
  if (!a) return <EmptyState title="Result not found" action={<Button href="/exams">Back to exams</Button>} />;
  const r = a.result; const prev = [...state.attempts].filter((x) => x.examId === a.examId && x.submittedAt < a.submittedAt).at(-1);
  const topics = Object.entries(r.byTopic).map(([t, b]) => ({ label: topicName(t), value: Math.round(b.accuracy), id: t })).sort((x, y) => y.value - x.value);
  const strong = topics.filter((t) => t.value >= 70), weak = topics.filter((t) => t.value < 60);
  const subjects = SUBJECTS.map((s) => { const ts = Object.entries(r.byTopic).filter(([t]) => TOPICS.find((x) => x.id === t)?.subjectId === s.id); const tot = ts.reduce((n, [, b]) => n + b.total, 0), c = ts.reduce((n, [, b]) => n + b.correct, 0); return { label: s.name, value: tot ? Math.round((c / tot) * 100) : -1, color: s.color }; }).filter((s) => s.value >= 0);
  const recs = recommend(topicStats(state).filter((t) => r.byTopic[t.topicId]), 3);
  return <><PageHeader title={a.type === "DIAGNOSTIC" ? "Diagnostic results" : "Exam results"} sub={a.title} />
    <Card className="text-center"><p className="text-6xl font-extrabold text-primary">{Math.round(r.percentage)}%</p><div className="mt-2"><Badge tone={r.passed ? "success" : "warning"}>{r.passed ? "Passed" : "Below pass mark"}</Badge></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-muted">Correct</dt><dd className="text-xl font-bold text-success">{r.correct}</dd></div><div><dt className="text-muted">Incorrect</dt><dd className="text-xl font-bold text-error">{r.incorrect}</dd></div><div><dt className="text-muted">Unanswered</dt><dd className="text-xl font-bold">{r.unanswered}</dd></div><div><dt className="text-muted">Time used</dt><dd className="text-xl font-bold">{fmtTime(r.timeUsedSeconds)}</dd></div></dl>
      {prev && <p className="mt-4 text-sm text-muted">Previous attempt: {Math.round(prev.result.percentage)}% → {Math.round(r.percentage - prev.result.percentage) >= 0 ? "+" : ""}{Math.round(r.percentage - prev.result.percentage)} points</p>}</Card>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {a.type === "DIAGNOSTIC" && <Card><h2 className="mb-3 font-bold">Subject scores</h2><BarChart label="Subject scores" data={subjects} /></Card>}
      <Card><h2 className="mb-3 font-bold">Topic performance</h2><BarChart label="Topic performance" data={topics} /></Card>
      <Card><h2 className="mb-3 font-bold">Difficulty performance</h2><BarChart label="Difficulty performance" data={Object.entries(r.byDifficulty).map(([k, b]) => ({ label: k[0] + k.slice(1).toLowerCase(), value: Math.round(b.accuracy) }))} /></Card>
      <Card><h2 className="font-bold">Strong</h2><p className="text-sm text-muted">{strong.map((t) => t.label).join(", ") || "None yet"}</p><h2 className="mt-3 font-bold">Needs improvement</h2><p className="text-sm text-muted">{weak.map((t) => t.label).join(", ") || "Nothing flagged"}</p></Card></div>
    <Card className="mt-4"><h2 className="font-bold">Next steps</h2>{recs.length ? <ul className="mt-2 space-y-2 text-sm">{recs.map((x) => <li key={x.topicId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-border/30 p-3"><span>{x.reason}</span><Button href={x.action === "READ_NOTE" ? "/notes" : `/practice?topic=${x.topicId}&difficulty=${x.difficulty}`} variant="secondary">{x.action === "READ_NOTE" ? "Read notes" : `Practice ${x.questionCount}`}</Button></li>)}</ul> : <p className="mt-2 text-sm text-muted">Keep practicing to unlock recommendations.</p>}</Card>
    <div className="mt-4 flex flex-wrap gap-2"><Button href={`/review/${a.id}`}>Review answers</Button><Button href="/dashboard" variant="secondary">Dashboard</Button><Button href={`/exams/${a.examId}`} variant="secondary">Retake</Button></div></>; }
