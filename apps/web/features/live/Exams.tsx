"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Clock, Flag, ChevronLeft, ChevronRight, Bookmark, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Progress, cx, useToast } from "../../components/ui";
import { BarChart } from "../../components/Charts";
import { api, ApiError } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { fmtTime } from "../../lib/exam";
import { Async, diffTone } from "./shared";

type ExamRow = { id: string; type: string; title: string; description: string | null; minutes: number; questionCount: number; passingScore: number; locked: boolean; bestPercentage: number | null; inProgressAttemptId: string | null };
export function LiveExams() {
  const q = useApi(() => api<ExamRow[]>("/exams"));
  return <><PageHeader title="Exams" sub="Topic quizzes, subject tests and full mock examinations." /><Async q={q}>{(rows) => rows.length ? <div className="grid gap-4 sm:grid-cols-2">{rows.map((e) => <Card key={e.id}><div className="flex items-center justify-between"><Badge tone={e.type === "MOCK" ? "accent" : "info"}>{e.type}</Badge>{e.locked && <Lock size={16} className="text-accent" aria-label="Premium" />}</div>
    <h2 className="mt-2 font-bold">{e.title}</h2><p className="text-sm text-muted">{e.description}</p><p className="mt-2 text-xs text-muted">{e.questionCount} questions · {e.minutes} min{e.bestPercentage != null ? ` · Best ${Math.round(e.bestPercentage)}%` : ""}</p>
    <Button href={e.locked ? "/pricing" : `/exams/${e.id}${e.inProgressAttemptId ? `?attempt=${e.inProgressAttemptId}` : ""}`} variant={e.locked ? "secondary" : "primary"} className="mt-3">{e.locked ? "Premium" : e.inProgressAttemptId ? "Continue" : "Start"}</Button></Card>)}</div> : <EmptyState title="No exams published yet" body="Check back soon." />}</Async></>;
}

type QItem = { id: string; text: string; type: string; difficulty: string; topicId: string; topicName: string; options: { id: string; text: string }[]; yourOptionId: string | null; yourNumeric: number | null; correctOptionId?: string | null; correctNumeric?: number | null; explanation?: string; isCorrect?: boolean | null };
type Attempt = { id: string; examId: string; title: string; type: string; status: string; deadlineAt: string; serverNow: string; result: null | { percentage: number; correct: number; incorrect: number; unanswered: number; timeUsedSeconds: number; passed: boolean; byTopic: Record<string, { total: number; correct: number; accuracy: number }>; byDifficulty: Record<string, { accuracy: number }> }; questions: QItem[] };
type Ans = { selectedOptionId?: string | null; numericAnswer?: number | null };

function Runner({ attemptId }: { attemptId: string }) {
  const router = useRouter(); const toast = useToast(); const q = useApi(() => api<Attempt>(`/attempts/${attemptId}`), [attemptId]);
  const [answers, setAnswers] = useState<Record<string, Ans>>({}); const [flag, setFlag] = useState<string[]>([]); const [idx, setIdx] = useState(0); const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now()); const [unsaved, setUnsaved] = useState(false); const offset = useRef(0); const pending = useRef<Record<string, Ans>>({}); const busy = useRef(false); const submitting = useRef(false);
  useEffect(() => { const a = q.data; if (!a) return; offset.current = new Date(a.serverNow).getTime() - Date.now(); if (a.status !== "IN_PROGRESS") { router.replace(`/results/${a.id}`); return; }
    setAnswers(Object.fromEntries(a.questions.filter((x) => x.yourOptionId || x.yourNumeric != null).map((x) => [x.id, { selectedOptionId: x.yourOptionId, numericAnswer: x.yourNumeric }]))); }, [q.data, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const flush = useCallback(async () => { if (busy.current || !Object.keys(pending.current).length) return; busy.current = true; const batch = pending.current; pending.current = {};
    try { const r = await api<{ expired?: boolean }>(`/attempts/${attemptId}/answers`, { method: "PUT", body: { answers: Object.entries(batch).map(([questionId, a]) => ({ questionId, ...a })) } }); setUnsaved(Object.keys(pending.current).length > 0); if (r.expired) router.replace(`/results/${attemptId}`); }
    catch (e) { pending.current = { ...batch, ...pending.current }; setUnsaved(true); if (e instanceof ApiError && e.code === "ATTEMPT_CLOSED") router.replace(`/results/${attemptId}`); } finally { busy.current = false; } }, [attemptId, router]);
  useEffect(() => { const t = setInterval(() => void flush(), 4000); return () => clearInterval(t); }, [flush]); // retries failed saves
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (unsaved) e.preventDefault(); }; addEventListener("beforeunload", h); return () => removeEventListener("beforeunload", h); }, [unsaved]);
  const submit = useCallback(async () => { if (submitting.current) return; submitting.current = true; try { await flush(); await api(`/attempts/${attemptId}/submit`, { method: "POST", body: {} }); router.replace(`/results/${attemptId}`); } catch (e) { submitting.current = false; toast(e instanceof ApiError ? e.message : "Could not submit. Try again.", "error"); } }, [attemptId, flush, router, toast]);
  const a = q.data; const remaining = a ? Math.ceil((new Date(a.deadlineAt).getTime() - (now + offset.current)) / 1000) : 1;
  useEffect(() => { if (a && a.status === "IN_PROGRESS" && remaining <= 0) void submit(); }, [a, remaining, submit]);
  return <Async q={q} rows={3}>{(att) => { if (att.status !== "IN_PROGRESS") return null; const qs = att.questions; const cur = qs[idx]!; const ans = answers[cur.id]; const done = Object.values(answers).filter((x) => x.selectedOptionId || x.numericAnswer != null).length;
    const set = (v: Ans) => { setAnswers((p) => ({ ...p, [cur.id]: v })); pending.current[cur.id] = v; setUnsaved(true); void flush(); };
    return <div className="space-y-4"><div className="sticky top-14 z-10 flex items-center justify-between rounded-card border border-border bg-surface p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{att.title}</p><p className="text-xs text-muted">Question {idx + 1} of {qs.length} · {done} answered{unsaved ? " · saving…" : " · saved"}</p></div>
      <p role="timer" aria-label="Time remaining" className={cx("flex items-center gap-1 font-mono text-lg font-bold", remaining < 60 && "text-error")}><Clock size={18} aria-hidden />{fmtTime(remaining)}</p></div>
      {unsaved && <p role="status" className="rounded-xl bg-warning/15 p-2 text-center text-xs text-warning">Some answers are not saved yet. Keep this page open; we are retrying.</p>}
      <Progress value={((idx + 1) / qs.length) * 100} label="Exam progress" />
      <Card><div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{cur.text}</h2><button aria-pressed={flag.includes(cur.id)} aria-label="Flag question" onClick={() => setFlag((f) => f.includes(cur.id) ? f.filter((x) => x !== cur.id) : [...f, cur.id])} className={cx("min-h-[44px] min-w-[44px] rounded-xl border p-2", flag.includes(cur.id) ? "border-warning bg-warning/15 text-warning" : "border-border")}><Flag size={18} /></button></div>
        {cur.type === "NUMERICAL" ? <input aria-label="Your answer" inputMode="decimal" className="mt-4 w-full rounded-xl border border-border bg-surface px-3 py-3 text-lg" value={ans?.numericAnswer ?? ""} onChange={(e) => { const v = e.target.value.trim(); set({ numericAnswer: v === "" || Number.isNaN(Number(v)) ? null : Number(v) }); }} /> :
          <fieldset className="mt-4 space-y-2"><legend className="sr-only">Answer choices</legend>{cur.options.map((o) => <label key={o.id} className={cx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3", ans?.selectedOptionId === o.id ? "border-primary bg-primary/10" : "border-border")}><input type="radio" name={cur.id} checked={ans?.selectedOptionId === o.id} onChange={() => set({ selectedOptionId: o.id })} />{o.text}</label>)}</fieldset>}</Card>
      <div className="flex justify-between gap-2"><Button variant="secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft size={16} />Previous</Button>{idx < qs.length - 1 ? <Button onClick={() => setIdx(idx + 1)}>Next<ChevronRight size={16} /></Button> : <Button onClick={() => setConfirm(true)}>Submit</Button>}</div>
      <nav aria-label="Question navigator" className="flex flex-wrap gap-2">{qs.map((x, i) => { const d = answers[x.id]?.selectedOptionId || answers[x.id]?.numericAnswer != null; return <button key={x.id} onClick={() => setIdx(i)} aria-label={`Question ${i + 1}${d ? ", answered" : ""}${flag.includes(x.id) ? ", flagged" : ""}`} aria-current={i === idx} className={cx("h-10 w-10 rounded-lg border text-sm font-semibold", i === idx && "ring-2 ring-accent", d ? "border-primary bg-primary text-white" : "border-border", flag.includes(x.id) && "border-2 border-warning")}>{i + 1}</button>; })}</nav>
      <div className="text-center"><Button variant="ghost" onClick={() => setConfirm(true)}>Submit exam</Button></div>
      <Modal open={confirm} title="Submit your exam?" onClose={() => setConfirm(false)}><p className="text-sm">{qs.length - done > 0 ? `${qs.length - done} question(s) are unanswered. ` : "All questions are answered. "}You cannot change answers after submitting.</p><div className="mt-4 flex gap-2"><Button onClick={submit}>Submit now</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button></div></Modal></div>; }}</Async>;
}

function ExamPageInner({ examId }: { examId: string }) {
  const sp = useSearchParams(); const router = useRouter(); const attempt = sp.get("attempt"); const exams = useApi(() => api<ExamRow[]>("/exams")); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (attempt) return <Runner attemptId={attempt} />;
  return <Async q={exams}>{(list) => { const e = list.find((x) => x.id === examId); if (!e) return <EmptyState title="Exam not found" action={<Button href="/exams">Back to exams</Button>} />;
    if (e.locked) return <Card className="text-center"><Lock className="mx-auto text-accent" /><h1 className="mt-2 text-xl font-bold">{e.title}</h1><p className="mt-1 text-sm text-muted">This exam is part of Premium.</p><Button href="/pricing" className="mt-4">See plans</Button></Card>;
    return <Card><h1 className="text-2xl font-bold">{e.title}</h1><p className="mt-1 text-muted">{e.description}</p><dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div><dt className="text-muted">Questions</dt><dd className="text-xl font-bold">{e.questionCount}</dd></div><div><dt className="text-muted">Minutes</dt><dd className="text-xl font-bold">{e.minutes}</dd></div><div><dt className="text-muted">Pass mark</dt><dd className="text-xl font-bold">{e.passingScore}%</dd></div></dl>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted"><li>Answers are saved as you go. If you refresh, you can continue.</li><li>The time limit is enforced by the server. When time ends, the exam submits automatically.</li></ul>{err && <p role="alert" className="mt-3 text-sm text-error">{err}</p>}
      <Button className="mt-6" loading={busy} onClick={async () => { setBusy(true); setErr(""); try { const r = await api<{ attemptId: string }>("/attempts", { method: "POST", body: { examId } }); router.replace(`/exams/${examId}?attempt=${r.attemptId}`); } catch (x) { setErr(x instanceof ApiError ? x.message : "Could not start"); } finally { setBusy(false); } }}>Start {e.type === "DIAGNOSTIC" ? "assessment" : "exam"}</Button></Card>; }}</Async>;
}
export function LiveExamPage({ examId }: { examId: string }) { return <Suspense><ExamPageInner examId={examId} /></Suspense>; }

export function LiveResults({ id }: { id: string }) {
  const q = useApi(() => api<Attempt>(`/attempts/${id}`), [id]);
  return <Async q={q}>{(a) => { const r = a.result; if (!r) return <EmptyState title="This attempt is still in progress" action={<Button href={`/exams/${a.examId}?attempt=${a.id}`}>Continue exam</Button>} />;
    const names = Object.fromEntries(a.questions.map((x) => [x.topicId, x.topicName])); const topics = Object.entries(r.byTopic).map(([t, b]) => ({ label: names[t] ?? "Topic", value: Math.round(b.accuracy) })).sort((x, y) => y.value - x.value);
    return <><PageHeader title={a.type === "DIAGNOSTIC" ? "Diagnostic results" : "Exam results"} sub={a.title} /><Card className="text-center"><p className="text-6xl font-extrabold text-primary">{Math.round(r.percentage)}%</p><div className="mt-2"><Badge tone={r.passed ? "success" : "warning"}>{r.passed ? "Passed" : "Below pass mark"}</Badge></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-muted">Correct</dt><dd className="text-xl font-bold text-success">{r.correct}</dd></div><div><dt className="text-muted">Incorrect</dt><dd className="text-xl font-bold text-error">{r.incorrect}</dd></div><div><dt className="text-muted">Unanswered</dt><dd className="text-xl font-bold">{r.unanswered}</dd></div><div><dt className="text-muted">Time used</dt><dd className="text-xl font-bold">{fmtTime(r.timeUsedSeconds)}</dd></div></dl></Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">Topic performance</h2><BarChart label="Topic performance" data={topics} /></Card><Card><h2 className="mb-3 font-bold">Difficulty performance</h2><BarChart label="Difficulty performance" data={Object.entries(r.byDifficulty).map(([k, b]) => ({ label: k[0] + k.slice(1).toLowerCase(), value: Math.round(b.accuracy) }))} /></Card></div>
      <Card className="mt-4"><h2 className="font-bold">Next steps</h2><p className="mt-1 text-sm text-muted">Strong: {topics.filter((t) => t.value >= 70).map((t) => t.label).join(", ") || "none yet"}. Needs improvement: {topics.filter((t) => t.value < 60).map((t) => t.label).join(", ") || "nothing flagged"}.</p><div className="mt-3 flex flex-wrap gap-2"><Button href="/practice?mode=wrong" variant="secondary">Practice my mistakes</Button><Button href="/dashboard" variant="secondary">See recommendations</Button></div></Card>
      <div className="mt-4 flex flex-wrap gap-2"><Button href={`/review/${a.id}`}>Review answers</Button><Button href="/exams" variant="secondary">All exams</Button></div></>; }}</Async>;
}

export function LiveReview({ id }: { id: string }) {
  const q = useApi(() => api<Attempt>(`/attempts/${id}`), [id]); const bms = useApi(() => api<{ type: string; id: string }[]>("/bookmarks")); const toast = useToast();
  return <Async q={q}>{(a) => <><PageHeader title="Review" sub={a.title} /><div className="space-y-4">{a.questions.map((x, i) => { const given = x.type === "NUMERICAL" ? x.yourNumeric : x.options.find((o) => o.id === x.yourOptionId)?.text ?? null; const correct = x.type === "NUMERICAL" ? x.correctNumeric : x.options.find((o) => o.id === x.correctOptionId)?.text; const marked = bms.data?.some((b) => b.type === "QUESTION" && b.id === x.id);
    return <Card key={x.id}><div className="flex justify-between gap-3"><div className="flex items-center gap-2">{x.isCorrect === true ? <CheckCircle2 className="text-success" aria-label="Correct" /> : x.isCorrect === false ? <XCircle className="text-error" aria-label="Incorrect" /> : <MinusCircle className="text-muted" aria-label="Unanswered" />}<span className="font-semibold">{i + 1}. {x.text}</span></div>
      <button aria-pressed={!!marked} aria-label="Bookmark question" className="min-h-[44px] min-w-[44px] p-2" onClick={async () => { await api("/bookmarks", { method: marked ? "DELETE" : "POST", body: { type: "QUESTION", id: x.id } }); bms.reload(); toast(marked ? "Bookmark removed" : "Bookmarked", "info"); }}><Bookmark size={18} className={marked ? "fill-accent text-accent" : ""} /></button></div>
      <p className="mt-2 text-sm">Your answer: <b>{given ?? "No answer"}</b></p><p className="text-sm">Correct answer: <b className="text-success">{correct}</b></p><p className="mt-2 rounded-xl bg-border/30 p-3 text-sm">{x.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge>{x.topicName}</Badge><Badge tone={diffTone(x.difficulty)}>{x.difficulty}</Badge><Link className="text-sm underline" href={`/practice?mode=topic&topic=${x.topicId}`}>Practice similar</Link></div></Card>; })}</div></>}</Async>;
}
