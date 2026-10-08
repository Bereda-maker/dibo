"use client";
import { DEMO } from "../../../lib/config";
import { LiveMistakes } from "../../../features/live/Social";
import { Button, Card, EmptyState, PageHeader, Badge } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { getQ, correctText } from "../../../lib/exam";
import { topicName } from "../../../lib/mock";
function DemoP() {
  const { state } = useStore(); const last = new Map<string, boolean>();
  state.attempts.forEach((a) => a.result.outcomes.forEach((o) => o.status !== "UNANSWERED" && last.set(o.questionId, o.status === "CORRECT"))); state.practice.forEach((p) => last.set(p.qid, p.correct));
  const wrong = [...last].filter(([, ok]) => !ok).map(([id]) => getQ(id)!).filter(Boolean);
  return <><PageHeader title="Questions I Got Wrong" sub="Your revision area. Questions leave this list when you answer them correctly." action={wrong.length ? <Button href="/practice?mode=wrong">Practice these</Button> : undefined} />
    {!wrong.length ? <EmptyState title="No mistakes to review" body="Answer some questions and anything you miss will appear here." action={<Button href="/practice">Start practice</Button>} /> :
      <div className="space-y-3">{wrong.map((q) => <Card key={q.id}><p className="font-semibold">{q.text}</p><p className="mt-1 text-sm">Correct answer: <b className="text-success">{correctText(q)}</b></p><p className="mt-1 text-sm text-muted">{q.explanation}</p><div className="mt-2 flex gap-2"><Badge>{topicName(q.topicId)}</Badge><Badge tone="info">{q.difficulty}</Badge></div></Card>)}</div>}</>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveMistakes />; }
