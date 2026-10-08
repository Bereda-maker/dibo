"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, ChevronLeft, ChevronRight, Clock, Lock } from "lucide-react";
import { scoreExam, type SubmittedAnswer } from "@dibora/core/exam-scoring";
import { Button, Card, Modal, Progress, cx, EmptyState } from "./ui";
import { useStore, type Attempt, type InProgress } from "../lib/store";
import { getExam, getQ, toScorable, fmtTime, uid } from "../lib/exam";
import { can, resolveEntitlements } from "@dibora/core/entitlement";

export function ExamRunner({ examId }: { examId: string }) {
  const { state, update, markActive } = useStore(); const router = useRouter();
  const exam = getExam(examId); const run = state.inProgress[examId];
  const [now, setNow] = useState(() => Date.now()); const [confirm, setConfirm] = useState(false); const submitted = useRef(false);
  const ent = resolveEntitlements(state.user?.plan === "PREMIUM" ? { status: "ACTIVE", endsAt: null, entitlements: { mockExams: true } } : null);

  const submit = useCallback(() => {
    if (!exam || !run || submitted.current) return; submitted.current = true;
    const answers = Object.values(run.answers); const qs = run.order.map((id) => getQ(id)!).filter(Boolean).map(toScorable);
    const result = scoreExam(qs, answers.map((a) => ({ ...a })), exam.passing);
    const used = Math.min(exam.minutes * 60, Math.round((Date.now() - run.startedAt) / 1000));
    const attempt: Attempt = { id: uid(), examId, title: exam.title, type: exam.type, submittedAt: new Date().toISOString(), result: { ...result, timeUsedSeconds: used }, answers, order: run.order };
    update((s) => { const rest = Object.fromEntries(Object.entries(s.inProgress).filter(([k]) => k !== examId)) as Record<string, InProgress>; return { ...s, attempts: [...s.attempts, attempt], inProgress: rest, user: s.user && exam.type === "DIAGNOSTIC" ? { ...s.user, learningStatus: "ACTIVE_LEARNER" } : s.user }; });
    markActive(); router.replace(`/results/${attempt.id}`);
  }, [exam, run, examId, update, markActive, router]);

  useEffect(() => { if (!run) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [run]);
  useEffect(() => { if (run && run.deadline - now <= 0) submit(); }, [run, now, submit]);
  useEffect(() => { // warn before accidental refresh/close; answers are autosaved anyway
    if (!run) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [run]);

  if (!exam) return <EmptyState title="Exam not found" action={<Button href="/exams">Back to exams</Button>} />;
  if (exam.premium && !can(ent, "mockExams")) return <Card className="text-center"><Lock className="mx-auto text-accent" /><h1 className="mt-2 text-xl font-bold">{exam.title}</h1><p className="mt-1 text-sm text-muted">This exam is part of Premium.</p><Button href="/pricing" className="mt-4">See plans</Button></Card>;

  if (!run) return (<Card><h1 className="text-2xl font-bold">{exam.title}</h1><p className="mt-1 text-muted">{exam.description}</p>
    <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div><dt className="text-muted">Questions</dt><dd className="text-xl font-bold">{exam.questionIds.length}</dd></div><div><dt className="text-muted">Minutes</dt><dd className="text-xl font-bold">{exam.minutes}</dd></div><div><dt className="text-muted">Pass mark</dt><dd className="text-xl font-bold">{exam.passing}%</dd></div></dl>
    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted"><li>Your answers are saved as you go. If you refresh, you can continue.</li><li>The timer runs on the server clock deadline. When time ends, the exam submits automatically.</li><li>You can flag questions and come back to them before submitting.</li></ul>
    <Button className="mt-6" onClick={() => { const t = Date.now(); update((s) => ({ ...s, inProgress: { ...s.inProgress, [examId]: { startedAt: t, deadline: t + exam.minutes * 60000, order: exam.questionIds, answers: {}, flagged: [], index: 0 } } })); }}>Start {exam.type === "DIAGNOSTIC" ? "assessment" : "exam"}</Button></Card>);

  const q = getQ(run.order[run.index]!)!; const a = run.answers[q.id]; const remaining = Math.ceil((run.deadline - now) / 1000);
  const patch = (fn: (r: InProgress) => InProgress) => update((s) => (s.inProgress[examId] ? { ...s, inProgress: { ...s.inProgress, [examId]: fn(s.inProgress[examId]!) } } : s));
  const answer = (v: Partial<SubmittedAnswer>) => patch((r) => ({ ...r, answers: { ...r.answers, [q.id]: { ...r.answers[q.id], questionId: q.id, ...v } } }));
  const answered = Object.values(run.answers).filter((x) => x.selectedOptionId || x.numericAnswer != null).length;
  const flagged = run.flagged.includes(q.id);
  return (<div className="space-y-4">
    <div className="sticky top-14 z-10 flex items-center justify-between rounded-card border border-border bg-surface p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{exam.title}</p><p className="text-xs text-muted">Question {run.index + 1} of {run.order.length} · {answered} answered</p></div>
      <p role="timer" aria-label="Time remaining" className={cx("flex items-center gap-1 font-mono text-lg font-bold", remaining < 60 && "text-error")}><Clock size={18} aria-hidden />{fmtTime(remaining)}</p></div>
    <Progress value={((run.index + 1) / run.order.length) * 100} label="Exam progress" />
    <Card><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{q.text}</h2><button onClick={() => patch((r) => ({ ...r, flagged: flagged ? r.flagged.filter((x) => x !== q.id) : [...r.flagged, q.id] }))} aria-pressed={flagged} aria-label="Flag question" className={cx("rounded-xl border p-2 min-h-[44px] min-w-[44px]", flagged ? "border-warning bg-warning/15 text-warning" : "border-border")}><Flag size={18} /></button></div>
      {q.type === "NUMERICAL" ? <div className="mt-4"><label htmlFor="num" className="text-sm font-medium">Your answer</label><input id="num" inputMode="decimal" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-lg" value={a?.numericAnswer ?? ""} onChange={(e) => { const v = e.target.value.trim(); answer({ numericAnswer: v === "" || Number.isNaN(Number(v)) ? null : Number(v) }); }} /></div> :
        <fieldset className="mt-4 space-y-2"><legend className="sr-only">Answer choices</legend>{q.options.map((o) => <label key={o.id} className={cx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3", a?.selectedOptionId === o.id ? "border-primary bg-primary/10" : "border-border")}><input type="radio" name={q.id} checked={a?.selectedOptionId === o.id} onChange={() => answer({ selectedOptionId: o.id })} />{o.text}</label>)}</fieldset>}</Card>
    <div className="flex items-center justify-between gap-2"><Button variant="secondary" disabled={run.index === 0} onClick={() => patch((r) => ({ ...r, index: r.index - 1 }))}><ChevronLeft size={16} />Previous</Button>
      {run.index < run.order.length - 1 ? <Button onClick={() => patch((r) => ({ ...r, index: r.index + 1 }))}>Next<ChevronRight size={16} /></Button> : <Button onClick={() => setConfirm(true)}>Submit</Button>}</div>
    <nav aria-label="Question navigator" className="flex flex-wrap gap-2">{run.order.map((id, i) => { const x = run.answers[id]; const done = x && (x.selectedOptionId || x.numericAnswer != null); return <button key={id} onClick={() => patch((r) => ({ ...r, index: i }))} aria-label={`Question ${i + 1}${done ? ", answered" : ""}${run.flagged.includes(id) ? ", flagged" : ""}`} aria-current={i === run.index} className={cx("h-10 w-10 rounded-lg border text-sm font-semibold", i === run.index && "ring-2 ring-accent", done ? "bg-primary text-white border-primary" : "border-border", run.flagged.includes(id) && "border-warning border-2")}>{i + 1}</button>; })}</nav>
    <div className="text-center"><Button variant="ghost" onClick={() => setConfirm(true)}>Submit exam</Button></div>
    <Modal open={confirm} title="Submit your exam?" onClose={() => setConfirm(false)}><p className="text-sm">{run.order.length - answered > 0 ? `${run.order.length - answered} question(s) are unanswered. ` : "All questions are answered. "}{run.flagged.length ? `${run.flagged.length} flagged. ` : ""}You cannot change answers after submitting.</p>
      <div className="mt-4 flex gap-2"><Button onClick={submit}>Submit now</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button></div></Modal></div>);
}
