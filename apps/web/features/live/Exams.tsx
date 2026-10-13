"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Clock, Flag, ChevronLeft, ChevronRight, Bookmark, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Progress, cx, useToast } from "../../components/ui";
import { BarChart } from "../../components/Charts";
import { api, ApiError, isOfflineQueued } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { fmtTime } from "../../lib/exam";
import { Async, diffTone } from "./shared";

type ExamRow = { id: string; type: string; title: string; description: string | null; minutes: number; questionCount: number; passingScore: number; locked: boolean; bestPercentage: number | null; inProgressAttemptId: string | null; subjectId?: string | null; subjectName?: string | null };

type CatalogExam = ExamRow & { subjectKey: string; subjectLabel: string };

const subjectPalette = [
  { tint: "#0b5d3b", soft: "#e8f4ee" },
  { tint: "#2563a6", soft: "#eaf2fb" },
  { tint: "#b7791f", soft: "#fbf3df" },
  { tint: "#8a3b6e", soft: "#f7eaf3" },
  { tint: "#6b4bb1", soft: "#f0ebfb" },
];

function catalogSubject(e: ExamRow) {
  if (e.subjectId || e.subjectName) return { key: e.subjectId ?? e.subjectName!, label: e.subjectName ?? "Subject" };
  if (e.type === "DIAGNOSTIC") return { key: "all-subjects", label: "All subjects" };
  if (e.type === "MOCK") return { key: "all-subjects", label: "All subjects" };
  return { key: "other", label: "Other exams" };
}

export function ExamCatalog({ rows }: { rows: ExamRow[] }) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const catalog = rows.map((e) => ({ ...e, ...catalogSubject(e) })).map((e) => ({ ...e, subjectKey: e.key, subjectLabel: e.label }));
  const subjects = Array.from(new Map(catalog.map((e) => [e.subjectKey, e])).values()).map((first, index) => {
    const palette = subjectPalette[index % subjectPalette.length] ?? subjectPalette[0]!;
    return { key: first.subjectKey, label: first.subjectLabel, exams: catalog.filter((e) => e.subjectKey === first.subjectKey), palette };
  });
  const selected = subjects.find((x) => x.key === selectedSubject);

  if (!rows.length) return <EmptyState title="No exams published yet" body="Check back soon." />;
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary to-secondary p-5 text-white shadow-card sm:p-7">
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-2xl" aria-hidden />
      <div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your exam library</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Choose a subject. Find your next win.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Start with a subject to see topic quizzes, subject tests, and mock exams in one focused view.</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/80"><span className="rounded-full bg-white/10 px-3 py-1.5">{rows.length} exams available</span><span className="rounded-full bg-white/10 px-3 py-1.5">Progress saved automatically</span></div></div>
    </div>
    {selected ? <section aria-labelledby="selected-subject-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><button type="button" onClick={() => setSelectedSubject(null)} className="mb-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10"><ChevronLeft size={16} />All subjects</button><h2 id="selected-subject-heading" className="text-2xl font-bold">{selected.label}</h2><p className="mt-1 text-sm text-muted">{selected.exams.length} exam{selected.exams.length === 1 ? "" : "s"} to help you practice with purpose.</p></div><span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">Subject view</span></div>
      <div className="grid gap-4 sm:grid-cols-2">{selected.exams.map((e) => <ExamCard key={e.id} exam={e} />)}</div>
    </section> : <section aria-labelledby="subject-heading"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Browse by subject</p><h2 id="subject-heading" className="mt-1 text-2xl font-bold">What are you studying today?</h2></div><span className="hidden text-sm text-muted sm:block">{subjects.length} areas</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((subject, index) => { const best = subject.exams.filter((e) => e.bestPercentage != null).map((e) => e.bestPercentage!); const locked = subject.exams.filter((e) => e.locked).length; return <button type="button" key={subject.key} onClick={() => setSelectedSubject(subject.key)} className="group relative overflow-hidden rounded-[1.25rem] border border-border bg-surface p-5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"><span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: subject.palette.tint }} /><div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold" style={{ color: subject.palette.tint, backgroundColor: subject.palette.soft }}>{String(index + 1).padStart(2, "0")}</span><span className="rounded-full bg-border/50 px-2.5 py-1 text-xs font-semibold text-muted">{subject.exams.length} exam{subject.exams.length === 1 ? "" : "s"}</span></div><h3 className="mt-5 text-lg font-bold">{subject.label}</h3><p className="mt-1 text-sm text-muted">{locked ? `${locked} premium option${locked === 1 ? "" : "s"} · ` : ""}{best.length ? `Best ${Math.round(Math.max(...best))}%` : "Ready when you are"}</p><div className="mt-5 flex items-center justify-between text-sm font-bold" style={{ color: subject.palette.tint }}><span>Explore exams</span><span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span></div></button>; })}</div></section>}
  </div>;
}

function ExamCard({ exam: e }: { exam: CatalogExam }) {
  return <Card className="group relative overflow-hidden !p-0 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"><div className="h-1.5 bg-gradient-to-r from-primary via-primary-light to-accent" /><div className="p-5"><div className="flex items-center justify-between gap-3"><Badge tone={e.type === "MOCK" ? "accent" : e.type === "DIAGNOSTIC" ? "info" : "muted"}>{e.type === "DIAGNOSTIC" ? "ASSESSMENT" : e.type}</Badge>{e.locked && <Lock size={17} className="text-accent" aria-label="Premium" />}</div><h3 className="mt-3 text-lg font-bold leading-snug">{e.title}</h3>{e.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{e.description}</p>}<div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted"><span className="rounded-full bg-border/45 px-2.5 py-1.5">{e.questionCount} questions</span><span className="rounded-full bg-border/45 px-2.5 py-1.5"><Clock size={13} className="mr-1 inline" />{e.minutes} min</span>{e.bestPercentage != null && <span className="rounded-full bg-success/10 px-2.5 py-1.5 text-success">Best {Math.round(e.bestPercentage)}%</span>}</div><Button href={e.locked ? "/pricing" : `/exams/${e.id}${e.inProgressAttemptId ? `?attempt=${e.inProgressAttemptId}` : ""}`} variant={e.locked ? "secondary" : "primary"} className="mt-5 w-full sm:w-auto">{e.locked ? "View premium" : e.inProgressAttemptId ? "Continue exam" : "Start exam"}</Button></div></Card>;
}

export function LiveExams() {
  const q = useApi(() => api<ExamRow[]>("/exams"));
  return <><PageHeader title="Exams" sub="A calmer way to move from subject practice to confident exam day." /><Async q={q}>{(rows) => <ExamCatalog rows={rows} />}</Async></>;
}

type QItem = { id: string; text: string; type: string; difficulty: string; topicId: string; topicName: string; options: { id: string; text: string }[]; yourOptionId: string | null; yourNumeric: number | null; correctOptionId?: string | null; correctNumeric?: number | null; explanation?: string; isCorrect?: boolean | null };
type Attempt = { id: string; examId: string; title: string; type: string; status: string; deadlineAt: string; serverNow: string; result: null | { percentage: number; correct: number; incorrect: number; unanswered: number; timeUsedSeconds: number; passed: boolean; byTopic: Record<string, { total: number; correct: number; accuracy: number }>; byDifficulty: Record<string, { accuracy: number }> }; questions: QItem[] };
type Ans = { selectedOptionId?: string | null; numericAnswer?: number | null };

function Runner({ attemptId }: { attemptId: string }) {
  const router = useRouter(); const toast = useToast(); const q = useApi(() => api<Attempt>(`/attempts/${attemptId}`), [attemptId]);
  const [answers, setAnswers] = useState<Record<string, Ans>>({}); const [flag, setFlag] = useState<string[]>([]); const [idx, setIdx] = useState(0); const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now()); const [unsaved, setUnsaved] = useState(false); const [submitState, setSubmitState] = useState<"idle" | "saving" | "submitting" | "complete" | "queued">("idle"); const offset = useRef(0); const pending = useRef<Record<string, Ans>>({}); const busy = useRef(false); const submitting = useRef(false);
  useEffect(() => { const a = q.data; if (!a) return; offset.current = new Date(a.serverNow).getTime() - Date.now(); if (a.status !== "IN_PROGRESS") { router.replace(`/results/${a.id}`); return; }
    setAnswers(Object.fromEntries(a.questions.filter((x) => x.yourOptionId || x.yourNumeric != null).map((x) => [x.id, { selectedOptionId: x.yourOptionId, numericAnswer: x.yourNumeric }]))); }, [q.data, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const flush = useCallback(async () => { if (busy.current) await new Promise<void>((resolve) => { const wait = () => busy.current ? window.setTimeout(wait, 50) : resolve(); wait(); }); if (!Object.keys(pending.current).length) return; busy.current = true; const batch = pending.current; pending.current = {};
    try { const r = await api<{ expired?: boolean }>(`/attempts/${attemptId}/answers`, { method: "PUT", body: { answers: Object.entries(batch).map(([questionId, a]) => ({ questionId, ...a })) } }); setUnsaved(Object.keys(pending.current).length > 0); if (r.expired) router.replace(`/results/${attemptId}`); }
    catch (e) { pending.current = { ...batch, ...pending.current }; setUnsaved(true); if (e instanceof ApiError && e.code === "ATTEMPT_CLOSED") router.replace(`/results/${attemptId}`); } finally { busy.current = false; } }, [attemptId, router]);
  useEffect(() => { const t = setInterval(() => void flush(), 4000); return () => clearInterval(t); }, [flush]); // retries failed saves
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (unsaved) e.preventDefault(); }; addEventListener("beforeunload", h); return () => removeEventListener("beforeunload", h); }, [unsaved]);
  const submit = useCallback(async () => { if (submitting.current) return; submitting.current = true; setSubmitState("saving"); try { await flush(); setSubmitState("submitting"); const result = await api(`/attempts/${attemptId}/submit`, { method: "POST", body: {} }); if (isOfflineQueued(result)) { setSubmitState("queued"); return; } setSubmitState("complete"); window.setTimeout(() => router.replace(`/results/${attemptId}`), 350); } catch (e) { submitting.current = false; setSubmitState("idle"); toast(e instanceof ApiError ? e.message : "Could not submit. Try again.", "error"); } }, [attemptId, flush, router, toast]);
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
      <Modal open={confirm} title={submitState === "idle" ? "Submit your exam?" : submitState === "queued" ? "Submission saved offline" : "Submitting your exam…"} onClose={() => { if (submitState === "idle" || submitState === "queued") setConfirm(false); }}><p className="text-sm">{submitState === "idle" ? <>{qs.length - done > 0 ? `${qs.length - done} question(s) are unanswered. ` : "All questions are answered. "}You cannot change answers after submitting.</> : <span role="status">{submitState === "saving" ? "Saving your latest answers securely…" : submitState === "submitting" ? "Checking your answers and preparing your results…" : submitState === "queued" ? "Your answers and submission are saved on this device. Reconnect to send them and view your result." : "Submission complete. Loading your results…"}</span>}</p>{submitState !== "idle" && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-semibold text-muted"><span>{submitState === "saving" ? "Saving answers" : submitState === "submitting" ? "Submitting" : submitState === "queued" ? "Waiting to sync" : "Complete"}</span><span>{submitState === "saving" ? "35%" : submitState === "submitting" ? "75%" : "100%"}</span></div><div className="h-3 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Exam submission progress" aria-valuenow={submitState === "saving" ? 35 : submitState === "submitting" ? 75 : 100} aria-valuemin={0} aria-valuemax={100}><div className={cx("h-full rounded-full bg-gradient-to-r from-primary-light via-primary to-accent transition-all duration-500", submitState !== "complete" && "animate-pulse")} style={{ width: submitState === "saving" ? "35%" : submitState === "submitting" ? "75%" : "100%" }} /></div></div>}{submitState === "idle" && <div className="mt-4 flex gap-2"><Button onClick={submit}>Submit now</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button></div>}{submitState === "queued" && <div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => setConfirm(false)}>Keep studying offline</Button></div>}</Modal></div>; }}</Async>;
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
    return <><PageHeader title={a.type === "DIAGNOSTIC" ? "Diagnostic results" : "Exam results"} sub={a.title} /><Card className="text-center"><p className="text-6xl font-extrabold text-primary">{Math.round(r.percentage)}%</p>{a.type !== "DIAGNOSTIC" && <div className="mt-2"><Badge tone={r.passed ? "success" : "warning"}>{r.passed ? "Passed" : "Below pass mark"}</Badge></div>}
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
