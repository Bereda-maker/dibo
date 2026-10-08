"use client";
import { useParams } from "next/navigation";
import { Bookmark, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, useToast } from "../../../../components/ui";
import { useStore } from "../../../../lib/store";
import { getQ, correctText } from "../../../../lib/exam";
import { topicName, NOTES } from "../../../../lib/mock";
export default function P() {
  const { id } = useParams<{ id: string }>(); const { state, update } = useStore(); const toast = useToast();
  const a = state.attempts.find((x) => x.id === id);
  if (!a) return <EmptyState title="Attempt not found" action={<Button href="/exams">Back</Button>} />;
  return <><PageHeader title="Review" sub={a.title} /><div className="space-y-4">{a.order.map((qid, i) => { const q = getQ(qid)!; const o = a.result.outcomes.find((x) => x.questionId === qid)!; const ans = a.answers.find((x) => x.questionId === qid);
    const given = q.type === "NUMERICAL" ? (ans?.numericAnswer ?? null) : q.options.find((x) => x.id === ans?.selectedOptionId)?.text ?? null; const marked = state.bookmarks.some((b) => b.type === "QUESTION" && b.id === qid); const note = NOTES.find((n) => n.topicId === q.topicId);
    return <Card key={qid}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2">{o.status === "CORRECT" ? <CheckCircle2 className="text-success" aria-label="Correct" /> : o.status === "INCORRECT" ? <XCircle className="text-error" aria-label="Incorrect" /> : <MinusCircle className="text-muted" aria-label="Unanswered" />}<span className="font-semibold">{i + 1}. {q.text}</span></div>
      <button aria-pressed={marked} aria-label="Bookmark question" className="min-h-[44px] min-w-[44px] rounded-xl p-2 hover:bg-border/50" onClick={() => { update((s) => ({ ...s, bookmarks: marked ? s.bookmarks.filter((b) => !(b.type === "QUESTION" && b.id === qid)) : [...s.bookmarks, { type: "QUESTION", id: qid }] })); toast(marked ? "Bookmark removed" : "Bookmarked", "info"); }}><Bookmark size={18} className={marked ? "fill-accent text-accent" : ""} /></button></div>
      <p className="mt-2 text-sm">Your answer: <b>{given ?? "No answer"}</b></p><p className="text-sm">Correct answer: <b className="text-success">{correctText(q)}</b></p><p className="mt-2 rounded-xl bg-border/30 p-3 text-sm">{q.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge>{topicName(q.topicId)}</Badge><Badge tone="info">{q.difficulty}</Badge>{note && <Button href={`/notes/${note.id}`} variant="secondary">Related note</Button>}<Button href={`/practice?topic=${q.topicId}`} variant="secondary">Practice similar</Button></div></Card>; })}</div></>; }
