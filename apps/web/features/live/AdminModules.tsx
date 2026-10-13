"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Archive, BookOpen, Check, Plus, RefreshCw, Search } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, PageHeader, Skeleton, inputCls, useToast } from "../../components/ui";
import { DataTable } from "../../components/DataTable";
import { api, ApiError } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { formatBirr } from "../../lib/mock";
import { useSession } from "../../lib/session";
import { notifyAdminActionCountsChanged } from "../../lib/useAdminActionCounts";

type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Subject = { id: string; slug: string; names: Record<string, string>; educationLevel: string; grade: number; stream: string | null; status: ContentStatus };
type Topic = { id: string; subjectId: string; slug: string; names: Record<string, string>; subjectName: string; status: ContentStatus };
type Material = { id: string; noteId: string | null; topicId: string; topicName: string; subjectName: string; kind: string; status: ContentStatus; title: string | null; summary: string | null };
type Curriculum = { subjects: Subject[]; topics: Topic[]; materials: Material[] };
type Paged<T> = { items: T[]; total: number; limit: number; offset: number };
type QuestionOption = { id: string; text: string; isCorrect: boolean };
type Question = { id: string; subjectId: string; topicId: string; subjectName: string; topicName: string; difficulty: string; type: string; text: string; explanation: string; numericAnswer: string | null; status: ContentStatus; options: QuestionOption[]; createdAt: string };
type Exam = { id: string; type: string; title: string; durationMinutes: number; questionCount: number; passingScore: number; requiresPremium: boolean; status: ContentStatus; attempts: number; completedAttempts: number; questionIds: string[] };
type Result = { id: string; examTitle: string; studentName: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; percentage: string | null };
type Analytics = { rangeDays: number; generatedAt: string; summary: { answers: number; completedExams: number; averageExamScore: number | null; newStudents: number; premiumStudents: number; activeSubscriptions: number; verifiedRevenueMinor: number; aiRequests: number }; topicsWithAccuracy: { topic: string; subject: string; attempts: number; accuracy: number }[] };

function useAction() {
  const toast = useToast(); const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, success: string, reload?: () => void) => {
    setBusy(true); try { await fn(); toast(success); notifyAdminActionCountsChanged(); reload?.(); return true; } catch (error) { toast(error instanceof ApiError ? error.message : "The request failed. Try again.", "error"); return false; } finally { setBusy(false); }
  };
  return { act, busy };
}
function StatusBadge({ status }: { status: ContentStatus }) { return <Badge tone={status === "PUBLISHED" ? "success" : status === "DRAFT" ? "warning" : "error"}>{status}</Badge>; }
function StatusActions({ status, onStatus }: { status: ContentStatus; onStatus: (status: ContentStatus) => void }) {
  return <div className="flex flex-wrap gap-1">{status !== "PUBLISHED" && <Button variant="secondary" onClick={() => onStatus("PUBLISHED")}><Check size={14} />Publish</Button>}{status === "PUBLISHED" && <Button variant="secondary" onClick={() => onStatus("DRAFT")}>Unpublish</Button>}{status !== "ARCHIVED" && <Button variant="danger" onClick={() => onStatus("ARCHIVED")}><Archive size={14} />Archive</Button>}</div>;
}
const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `entry-${Date.now()}`;
const contentStatusFromUrl = (value: string | null): "" | ContentStatus => value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED" ? value : "";

function LiveAdminContentInner() {
  const searchParams = useSearchParams(); const draftOnly = searchParams.get("status") === "DRAFT";
  const query = useApi<Curriculum>(() => api<Curriculum>("/admin/curriculum"), []); const { act, busy } = useAction(); const toast = useToast();
  const [subjectName, setSubjectName] = useState(""); const [grade, setGrade] = useState(12); const [stream, setStream] = useState("");
  const [topicName, setTopicName] = useState(""); const [subjectId, setSubjectId] = useState("");
  const [noteTitle, setNoteTitle] = useState(""); const [noteBody, setNoteBody] = useState(""); const [topicId, setTopicId] = useState("");
  const data = query.data;
  const createSubject = () => { if (!subjectName.trim()) return toast("Enter a subject name.", "error"); void act(() => api("/admin/subjects", { method: "POST", body: { educationLevel: "SECONDARY", grade, stream: stream || null, slug: toSlug(subjectName), names: { en: subjectName.trim() }, sortOrder: 0 } }), "Subject saved as draft.", query.reload); };
  const createTopic = () => { if (!subjectId || !topicName.trim()) return toast("Choose a subject and enter a topic name.", "error"); void act(() => api("/admin/topics", { method: "POST", body: { subjectId, slug: toSlug(topicName), names: { en: topicName.trim() }, sortOrder: 0 } }), "Topic saved as draft.", query.reload); };
  const createNote = () => {
    if (!topicId || !noteTitle.trim() || !noteBody.trim()) return toast("Choose a topic and complete the note title and explanation.", "error");
    void act(() => api("/admin/materials", { method: "POST", body: { topicId, kind: "NOTE", locale: "en", title: noteTitle.trim(), content: { explanation: noteBody.trim() } } }), "Learning material saved as draft.", query.reload);
  };
  const setStatus = (kind: "subject" | "topic" | "material", id: string, status: ContentStatus) => void act(() => api(`/admin/curriculum/${kind}/${id}/status`, { method: "PATCH", body: { status } }), `${kind} status updated.`, query.reload);
  if (query.error && !data) return <ErrorState message={query.error.message || "Could not load curriculum data."} onRetry={query.reload} />;
  if (query.loading && !data) return <Skeleton className="h-[520px]" />;
  if (!data) return null;
  const visibleSubjects = draftOnly ? data.subjects.filter((row) => row.status === "DRAFT") : data.subjects;
  const visibleTopics = draftOnly ? data.topics.filter((row) => row.status === "DRAFT") : data.topics;
  const visibleMaterials = draftOnly ? data.materials.filter((row) => row.status === "DRAFT") : data.materials;
  const totalDrafts = data.subjects.filter((row) => row.status === "DRAFT").length + data.topics.filter((row) => row.status === "DRAFT").length + data.materials.filter((row) => row.status === "DRAFT").length;
  return <>
    <PageHeader title={draftOnly ? "Curriculum drafts awaiting review" : "Curriculum & learning materials"} sub="Manage subjects, topics, and notes. Drafts stay private to admins until the required parent content is published." action={<div className="flex gap-2">{draftOnly && <Button variant="secondary" href="/admin/content">Show all</Button>}<Button variant="secondary" onClick={query.reload}><RefreshCw size={15} />Refresh</Button></div>} />
    {query.error && <p role="status" className="mb-4 text-sm text-warning">Refresh failed; showing the last loaded data.</p>}
    {draftOnly && totalDrafts === 0 && <p role="status" className="mb-4 rounded-xl border border-success/25 bg-success/5 p-3 text-sm text-success">No curriculum drafts are waiting for review.</p>}
    <div className="grid gap-4 xl:grid-cols-3">
      <Card><div className="mb-3 flex items-center gap-2"><BookOpen size={18} className="text-primary" /><h2 className="font-bold">Add subject</h2></div><div className="space-y-3"><Field label="Subject name">{(id) => <input id={id} className={inputCls} value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Biology" />}</Field><div className="grid grid-cols-2 gap-3"><Field label="Grade">{(id) => <input id={id} type="number" min="1" max="20" className={inputCls} value={grade} onChange={(e) => setGrade(Number(e.target.value))} />}</Field><Field label="Stream (optional)">{(id) => <input id={id} className={inputCls} value={stream} onChange={(e) => setStream(e.target.value)} />}</Field></div><Button onClick={createSubject} disabled={busy}><Plus size={15} />Create draft subject</Button></div></Card>
      <Card><div className="mb-3 flex items-center gap-2"><BookOpen size={18} className="text-primary" /><h2 className="font-bold">Add topic</h2></div><div className="space-y-3"><Field label="Parent subject">{(id) => <select id={id} className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Select subject</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.names.en ?? subject.slug}</option>)}</select>}</Field><Field label="Topic name">{(id) => <input id={id} className={inputCls} value={topicName} onChange={(e) => setTopicName(e.target.value)} />}</Field><Button onClick={createTopic} disabled={busy || !data.subjects.length}><Plus size={15} />Create draft topic</Button></div></Card>
      <Card><div className="mb-3 flex items-center gap-2"><BookOpen size={18} className="text-primary" /><h2 className="font-bold">Add learning note</h2></div><div className="space-y-3"><Field label="Topic">{(id) => <select id={id} className={inputCls} value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">Select topic</option>{data.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.subjectName} · {topic.names.en ?? topic.slug}</option>)}</select>}</Field><Field label="Note title">{(id) => <input id={id} className={inputCls} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />}</Field><Field label="Explanation">{(id) => <textarea id={id} rows={3} className={inputCls} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />}</Field><Button onClick={createNote} disabled={busy || !data.topics.length}><Plus size={15} />Create draft note</Button></div></Card>
    </div>
    <div className="mt-5 space-y-4"><Card><h2 className="mb-3 flex flex-wrap items-center gap-2 font-bold">Subjects <span className="text-xs font-normal text-muted">({visibleSubjects.length}{draftOnly ? ` of ${data.subjects.length}` : ""})</span>{data.subjects.some((row) => row.status === "DRAFT") && <Badge tone="warning">{data.subjects.filter((row) => row.status === "DRAFT").length} drafts</Badge>}</h2><DataTable rows={visibleSubjects} empty={draftOnly ? "No subject drafts need review." : "No subjects exist in the database yet."} cols={[{ key: "name", label: "Subject", render: (row) => row.names.en ?? row.slug }, { key: "grade", label: "Level", render: (row) => `${row.educationLevel} · Grade ${row.grade}${row.stream ? ` · ${row.stream}` : ""}` }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "actions", label: "Actions", render: (row) => <StatusActions status={row.status} onStatus={(status) => setStatus("subject", row.id, status)} /> }]} /></Card>
      <Card><h2 className="mb-3 flex flex-wrap items-center gap-2 font-bold">Topics <span className="text-xs font-normal text-muted">({visibleTopics.length}{draftOnly ? ` of ${data.topics.length}` : ""})</span>{data.topics.some((row) => row.status === "DRAFT") && <Badge tone="warning">{data.topics.filter((row) => row.status === "DRAFT").length} drafts</Badge>}</h2><DataTable rows={visibleTopics} empty={draftOnly ? "No topic drafts need review." : "No topics exist in the database yet."} cols={[{ key: "name", label: "Topic", render: (row) => row.names.en ?? row.slug }, { key: "subject", label: "Subject", render: (row) => row.subjectName }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "actions", label: "Actions", render: (row) => <StatusActions status={row.status} onStatus={(status) => setStatus("topic", row.id, status)} /> }]} /></Card>
      <Card><h2 className="mb-3 flex flex-wrap items-center gap-2 font-bold">Learning materials <span className="text-xs font-normal text-muted">({visibleMaterials.length}{draftOnly ? ` of ${data.materials.length}` : ""})</span>{data.materials.some((row) => row.status === "DRAFT") && <Badge tone="warning">{data.materials.filter((row) => row.status === "DRAFT").length} drafts</Badge>}</h2><DataTable rows={visibleMaterials} empty={draftOnly ? "No learning-material drafts need review." : "No materials exist in the database yet."} cols={[{ key: "title", label: "Material", render: (row) => row.title ?? "Untitled material" }, { key: "scope", label: "Topic / subject", render: (row) => `${row.subjectName} · ${row.topicName}` }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "actions", label: "Actions", render: (row) => <StatusActions status={row.status} onStatus={(status) => setStatus("material", row.id, status)} /> }]} /></Card></div>
  </>;
}

export function LiveAdminContent() { return <Suspense fallback={<Skeleton className="h-[520px]" />}><LiveAdminContentInner /></Suspense>; }

function LiveAdminQuestionsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalog = useApi<Curriculum>(() => api<Curriculum>("/admin/curriculum"), []);
  const statusParam = searchParams.get("status");
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<"" | ContentStatus>(contentStatusFromUrl(statusParam)); const [subjectId, setSubjectId] = useState(""); const [offset, setOffset] = useState(0);
  useEffect(() => { setStatus(contentStatusFromUrl(statusParam)); setOffset(0); }, [statusParam]);
  const path = `/admin/questions?limit=100&offset=${offset}${status ? `&status=${status}` : ""}${subjectId ? `&subjectId=${subjectId}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const query = useApi<Paged<Question>>(() => api<Paged<Question>>(path), [path]); const { act, busy } = useAction(); const toast = useToast();
  const [open, setOpen] = useState(false); const [subject, setSubject] = useState(""); const [topic, setTopic] = useState(""); const [difficulty, setDifficulty] = useState("MEDIUM"); const [type, setType] = useState("MULTIPLE_CHOICE"); const [text, setText] = useState(""); const [explanation, setExplanation] = useState(""); const [options, setOptions] = useState(["", "", "", ""]); const [correctIndex, setCorrectIndex] = useState(0); const [numericAnswer, setNumericAnswer] = useState("");
  const visibleTopics = catalog.data?.topics.filter((row) => row.subjectId === subject) ?? [];
  const load = () => { query.reload(); catalog.reload(); };
  const create = async () => {
    if (!subject || !topic) return toast("Select a subject and topic.", "error");
    const optionRows = type === "NUMERICAL" ? [] : (type === "TRUE_FALSE" ? ["True", "False"] : options).map((value, index) => ({ text: value.trim(), isCorrect: index === correctIndex })).filter((value) => value.text);
    const saved = await act(() => api("/admin/questions", { method: "POST", body: { subjectId: subject, topicId: topic, difficulty, type, text, explanation, options: optionRows, numericAnswer: type === "NUMERICAL" && numericAnswer.trim() ? Number(numericAnswer) : null, numericTolerance: 0, tags: [], source: null } }), "Question saved as draft.", load);
    if (!saved) return;
    setOpen(false); setText(""); setExplanation(""); setOptions(["", "", "", ""]); setNumericAnswer("");
  };
  const changeStatus = (row: Question, state: ContentStatus) => void act(() => api(`/admin/questions/${row.id}/${state === "PUBLISHED" ? "publish" : state === "ARCHIVED" ? "archive" : "unpublish"}`, { method: "POST", body: {} }), `Question ${state.toLowerCase()}.`, load);
  const rows = query.data?.items ?? [];
  return <>
    <PageHeader title={status === "DRAFT" ? "Question drafts awaiting review" : "Question bank"} sub={`${query.data?.total ?? "—"} ${status === "DRAFT" ? "draft questions" : "database questions"} · publishing is validated by the server`} action={<div className="flex flex-wrap gap-2">{status === "DRAFT" && <Button variant="secondary" href="/admin/questions">Show all</Button>}<Button onClick={() => setOpen(!open)}><Plus size={16} />{open ? "Close editor" : "New question"}</Button></div>} />
    {open && <Card className="mb-4"><h2 className="font-bold">Create question draft</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Subject">{(id) => <select id={id} className={inputCls} value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }}><option value="">Select subject</option>{(catalog.data?.subjects ?? []).map((row) => <option key={row.id} value={row.id}>{row.names.en ?? row.slug}</option>)}</select>}</Field>
      <Field label="Topic">{(id) => <select id={id} className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">Select topic</option>{visibleTopics.map((row) => <option key={row.id} value={row.id}>{row.names.en ?? row.slug}</option>)}</select>}</Field>
      <Field label="Question type">{(id) => <select id={id} className={inputCls} value={type} onChange={(e) => setType(e.target.value)}><option value="MULTIPLE_CHOICE">Multiple choice</option><option value="TRUE_FALSE">True / false</option><option value="NUMERICAL">Numerical</option></select>}</Field>
      <Field label="Difficulty">{(id) => <select id={id} className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select>}</Field>
      <div className="sm:col-span-2"><Field label="Question text">{(id) => <textarea id={id} rows={3} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />}</Field></div>
      {type === "MULTIPLE_CHOICE" && options.map((option, index) => <div key={index} className="flex items-center gap-2"><input type="radio" name="admin-correct-option" aria-label={`Mark option ${index + 1} correct`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} /><input aria-label={`Answer option ${index + 1}`} className={inputCls} value={option} onChange={(e) => setOptions(options.map((value, i) => i === index ? e.target.value : value))} placeholder={`Option ${index + 1}`} /></div>)}
      {type === "TRUE_FALSE" && <fieldset className="flex gap-5 sm:col-span-2"><legend className="text-sm font-medium">Correct answer</legend>{["True", "False"].map((value, index) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="admin-true-false" checked={correctIndex === index} onChange={() => setCorrectIndex(index)} />{value}</label>)}</fieldset>}
      {type === "NUMERICAL" && <Field label="Correct numerical answer">{(id) => <input id={id} inputMode="decimal" className={inputCls} value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} />}</Field>}
      <div className="sm:col-span-2"><Field label="Explanation">{(id) => <textarea id={id} rows={3} className={inputCls} value={explanation} onChange={(e) => setExplanation(e.target.value)} />}</Field></div>
    </div><div className="mt-4 flex justify-end"><Button onClick={() => void create()} disabled={busy}>Save draft</Button></div></Card>}
    <div className="mb-3 flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input className={inputCls + " pl-9"} value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} aria-label="Search questions" placeholder="Search question text" /></label><select className={inputCls + " max-w-[210px]"} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setOffset(0); }} aria-label="Filter by subject"><option value="">All subjects</option>{(catalog.data?.subjects ?? []).map((row) => <option key={row.id} value={row.id}>{row.names.en ?? row.slug}</option>)}</select><select className={inputCls + " max-w-[170px]"} value={status} onChange={(e) => { const next = contentStatusFromUrl(e.target.value); setStatus(next); setOffset(0); router.replace(`/admin/questions${next ? `?status=${next}` : ""}`, { scroll: false }); }} aria-label="Filter by status"><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></div>
    {query.error && !query.data ? <ErrorState message={query.error.message} onRetry={load} /> : query.loading && !query.data ? <Skeleton className="h-72" /> : <Card><DataTable rows={rows} empty="No questions match the selected filters." cols={[{ key: "text", label: "Question", render: (row) => <span className="line-clamp-2 max-w-md">{row.text}</span> }, { key: "scope", label: "Subject / topic", render: (row) => `${row.subjectName} · ${row.topicName}` }, { key: "type", label: "Type & difficulty", render: (row) => `${row.type.replaceAll("_", " ")} · ${row.difficulty}` }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "actions", label: "Actions", render: (row) => row.status === "ARCHIVED" ? <span className="text-xs text-muted">Archived</span> : <StatusActions status={row.status} onStatus={(state) => changeStatus(row, state)} /> }]} />
      {query.data && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted">Showing {query.data.total ? offset + 1 : 0}–{offset + rows.length} of {query.data.total}</span><div className="flex gap-2"><Button variant="secondary" disabled={offset === 0 || query.loading} onClick={() => setOffset(Math.max(0, offset - 100))}>Previous</Button><Button variant="secondary" disabled={offset + rows.length >= query.data.total || query.loading} onClick={() => setOffset(offset + 100)}>Next</Button></div></div>}</Card>}
  </>;
}

export function LiveAdminQuestions() { return <Suspense fallback={<Skeleton className="h-72" />}><LiveAdminQuestionsInner /></Suspense>; }

function LiveAdminExamsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalog = useApi<Curriculum>(() => api<Curriculum>("/admin/curriculum"), []);
  const questionsQuery = useApi<Paged<Question>>(() => api<Paged<Question>>("/admin/questions?status=PUBLISHED&limit=100"), []);
  const statusParam = searchParams.get("status");
  const [status, setStatus] = useState<"" | ContentStatus>(contentStatusFromUrl(statusParam)); const [offset, setOffset] = useState(0);
  useEffect(() => { setStatus(contentStatusFromUrl(statusParam)); setOffset(0); }, [statusParam]);
  const path = `/admin/exams?limit=100&offset=${offset}${status ? `&status=${status}` : ""}`;
  const examsQuery = useApi<Paged<Exam>>(() => api<Paged<Exam>>(path), [path]);
  const resultsQuery = useApi<Paged<Result>>(() => api<Paged<Result>>("/admin/results?limit=20"), []);
  const { act, busy } = useAction(); const toast = useToast(); const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [type, setType] = useState("MOCK"); const [subjectId, setSubjectId] = useState(""); const [minutes, setMinutes] = useState(60); const [pass, setPass] = useState(50); const [premium, setPremium] = useState(false); const [randomize, setRandomize] = useState(true); const [selected, setSelected] = useState<string[]>([]);
  const reload = () => { examsQuery.reload(); questionsQuery.reload(); resultsQuery.reload(); catalog.reload(); };
  const questionRows = questionsQuery.data?.items ?? [];
  const create = () => {
    if (selected.length === 0) return toast("Choose at least one published question.", "error");
    void act(() => api("/admin/exams", { method: "POST", body: { type, subjectId: subjectId || null, title, durationMinutes: minutes, passingScore: pass, attemptLimit: null, randomize, requiresPremium: premium, questionIds: selected } }), "Exam saved as draft.", reload);
    setOpen(false); setTitle(""); setSelected([]);
  };
  const setExamStatus = (row: Exam, next: ContentStatus) => void act(() => api(`/admin/exams/${row.id}/status`, { method: "PATCH", body: { status: next } }), `Exam ${next.toLowerCase()}.`, reload);
  return <>
    <PageHeader title={status === "DRAFT" ? "Exam drafts awaiting review" : "Exams & results"} sub="Build examinations from published questions. Results are read from submitted, server-scored attempts." action={<div className="flex flex-wrap gap-2">{status === "DRAFT" && <Button variant="secondary" href="/admin/exams">Show all</Button>}<Button onClick={() => setOpen(!open)}><Plus size={16} />{open ? "Close builder" : "Build exam"}</Button></div>} />
    {open && <Card className="mb-4"><h2 className="font-bold">Create exam draft</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Exam title">{(id) => <input id={id} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field><Field label="Exam type">{(id) => <select id={id} className={inputCls} value={type} onChange={(e) => setType(e.target.value)}><option value="MOCK">Mock exam</option><option value="SUBJECT">Subject exam</option><option value="TOPIC">Topic quiz</option><option value="PRACTICE">Practice</option></select>}</Field><Field label="Subject (optional)">{(id) => <select id={id} className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">All subjects</option>{(catalog.data?.subjects ?? []).map((row) => <option key={row.id} value={row.id}>{row.names.en ?? row.slug}</option>)}</select>}</Field><Field label="Duration (minutes)">{(id) => <input id={id} type="number" min={1} max={600} className={inputCls} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />}</Field><Field label="Passing score (%)">{(id) => <input id={id} type="number" min={0} max={100} className={inputCls} value={pass} onChange={(e) => setPass(Number(e.target.value))} />}</Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />Randomize questions</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />Premium required</label></div>
      <div className="mt-4"><p className="mb-2 text-sm font-semibold">Published questions ({selected.length} selected of {questionRows.length})</p><div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border p-3">{questionRows.filter((row) => !subjectId || row.subjectId === subjectId).map((row) => <label key={row.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /><span>{row.text}<span className="ml-2 text-xs text-muted">{row.subjectName} · {row.topicName}</span></span></label>)}{questionRows.length === 0 && <p className="text-sm text-muted">Publish questions before building an exam.</p>}</div></div><div className="mt-4 flex justify-end"><Button onClick={create} disabled={busy || !title.trim()}>Save draft exam</Button></div></Card>}
    <div className="mb-3 flex justify-end"><select className={inputCls + " max-w-48"} aria-label="Filter exams by status" value={status} onChange={(e) => { const next = contentStatusFromUrl(e.target.value); setStatus(next); setOffset(0); router.replace(`/admin/exams${next ? `?status=${next}` : ""}`, { scroll: false }); }}><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></div>
    {examsQuery.error && !examsQuery.data ? <ErrorState message={examsQuery.error.message} onRetry={reload} /> : examsQuery.loading && !examsQuery.data ? <Skeleton className="h-72" /> : <Card><DataTable rows={examsQuery.data?.items ?? []} empty="No exams in the database yet." cols={[{ key: "title", label: "Exam", render: (row) => row.title }, { key: "type", label: "Type / duration", render: (row) => `${row.type} · ${row.durationMinutes} min` }, { key: "questions", label: "Questions", render: (row) => row.questionCount }, { key: "attempts", label: "Attempts", render: (row) => `${row.completedAttempts} submitted / ${row.attempts} total` }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "actions", label: "Actions", render: (row) => row.status === "ARCHIVED" ? <span className="text-xs text-muted">Archived</span> : row.status === "PUBLISHED" ? <Button variant="danger" onClick={() => setExamStatus(row, "ARCHIVED")}><Archive size={14} />Archive</Button> : <StatusActions status={row.status} onStatus={(next) => setExamStatus(row, next)} /> }]} /></Card>}
    {examsQuery.data && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted">Showing {examsQuery.data.total ? offset + 1 : 0}–{offset + examsQuery.data.items.length} of {examsQuery.data.total}</span><div className="flex gap-2"><Button variant="secondary" disabled={offset === 0 || examsQuery.loading} onClick={() => setOffset(Math.max(0, offset - 100))}>Previous</Button><Button variant="secondary" disabled={offset + examsQuery.data.items.length >= examsQuery.data.total || examsQuery.loading} onClick={() => setOffset(offset + 100)}>Next</Button></div></div>}
    <Card className="mt-5"><h2 className="mb-3 font-bold">Recent submitted results</h2>{resultsQuery.error && !resultsQuery.data ? <p className="text-sm text-error">{resultsQuery.error.message}</p> : <DataTable rows={resultsQuery.data?.items ?? []} empty="No completed exam results are available." cols={[{ key: "student", label: "Student", render: (row) => row.studentName }, { key: "exam", label: "Exam", render: (row) => row.examTitle }, { key: "score", label: "Score", render: (row) => row.percentage === null ? "—" : `${Number(row.percentage).toFixed(1)}%` }, { key: "when", label: "Submitted", render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—" }]} />}</Card>
  </>;
}

export function LiveAdminExams() { return <Suspense fallback={<Skeleton className="h-72" />}><LiveAdminExamsInner /></Suspense>; }

export function LiveAdminAnalytics() {
  const [range, setRange] = useState<7 | 30 | 90>(30); const query = useApi<Analytics>(() => api<Analytics>(`/admin/analytics?range=${range}`), [range]);
  const data = query.data; const stats = data?.summary;
  if (query.error && !data) return <ErrorState message={query.error.message} onRetry={query.reload} />;
  return <>
    <PageHeader title="Analytics" sub="Operational and learning metrics queried from Deborah records. Every figure below reflects the selected period or current database state." action={<div className="flex gap-1 rounded-xl border border-border bg-surface p-1">{([7, 30, 90] as const).map((days) => <button key={days} aria-pressed={range === days} onClick={() => setRange(days)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${range === days ? "bg-primary text-white" : "text-muted"}`}>{days} days</button>)}</div>} />
    {query.loading && !data ? <Skeleton className="h-72" /> : stats && <>
      <p className="mb-3 text-right text-xs text-muted">Updated {new Date(data.generatedAt).toLocaleString()}</p>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Live platform analytics">
        {[
          ["New students", stats.newStudents.toLocaleString(), `${range}-day period`],
          ["Questions answered", stats.answers.toLocaleString(), `${range}-day period`],
          ["Completed exams", stats.completedExams.toLocaleString(), `${range}-day period`],
          ["Average exam score", stats.averageExamScore === null ? "Unavailable" : `${stats.averageExamScore}%`, "Submitted attempts only"],
          ["Premium students", stats.premiumStudents.toLocaleString(), "Current profile status"],
          ["Active subscriptions", stats.activeSubscriptions.toLocaleString(), "Current database status"],
          ["Verified revenue", formatBirr(stats.verifiedRevenueMinor), `${range}-day period · verified payments only`],
          ["AI requests", stats.aiRequests.toLocaleString(), `${range}-day period · user messages counted`],
        ].map(([label, value, detail]) => <Card key={label}><p className="text-sm font-medium text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-muted">{detail}</p></Card>)}
      </section>
      <Card className="mt-5"><div className="mb-3 flex items-start gap-2"><Activity size={19} className="mt-0.5 text-primary" /><div><h2 className="font-bold">Topic accuracy</h2><p className="mt-1 text-xs text-muted">Topics with at least three recorded answers in the selected period, ordered from lowest accuracy.</p></div></div><DataTable rows={data.topicsWithAccuracy.map((row, index) => ({ ...row, id: `${row.subject}-${row.topic}-${index}` }))} empty="Not enough recorded answers to calculate topic accuracy in this period." cols={[{ key: "topic", label: "Topic", render: (row) => row.topic }, { key: "subject", label: "Subject", render: (row) => row.subject }, { key: "attempts", label: "Answers", render: (row) => row.attempts }, { key: "accuracy", label: "Accuracy", render: (row) => <span className={row.accuracy < 60 ? "font-semibold text-warning" : ""}>{row.accuracy}%</span> }]} /></Card>
    </>}
  </>;
}

type Plan = { id: string; code: string; interval: string; names: Record<string, string>; priceMinor: number; currency: string; entitlements: Record<string, number | boolean>; isActive: boolean; sortOrder: number };
export function LiveAdminPlans() {
  const query = useApi<Plan[]>(() => api<Plan[]>("/admin/plans"), []); const { role } = useSession(); const toast = useToast();
  const [values, setValues] = useState<Record<string, { name: string; priceMinor: number }>>({}); const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { if (query.data) setValues(Object.fromEntries(query.data.map((plan) => [plan.code, { name: plan.names.en ?? plan.code, priceMinor: plan.priceMinor }]))); }, [query.data]);
  const save = async (plan: Plan) => {
    const value = values[plan.code]; if (!value) return;
    if (!window.confirm(`Update ${plan.names.en ?? plan.code}?\n\nPrice: ${formatBirr(plan.priceMinor)} → ${formatBirr(value.priceMinor)}\nName: ${plan.names.en ?? plan.code} → ${value.name}\n\nThis changes the plan shown to customers.`)) return;
    setSaving(plan.code);
    try { await api(`/admin/plans/${encodeURIComponent(plan.code)}`, { method: "PATCH", body: { priceMinor: value.priceMinor, names: { ...plan.names, en: value.name.trim() } } }); toast("Plan updated."); query.reload(); }
    catch (error) { toast(error instanceof ApiError ? error.message : "Could not update plan.", "error"); }
    finally { setSaving(null); }
  };
  return <>
    <PageHeader title="Plan pricing" sub="Prices are stored in santim (100 santim = ETB 1). Changes are made against the live plan records." />
    {role !== "SUPER_ADMIN" && <p className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-muted">You can review pricing, but only a Super Admin can change it.</p>}
    {query.error && !query.data ? <ErrorState message={query.error.message} onRetry={query.reload} /> : query.loading && !query.data ? <Skeleton className="h-60" /> : <div className="space-y-3">{(query.data ?? []).map((plan) => {
      const value = values[plan.code] ?? { name: plan.names.en ?? plan.code, priceMinor: plan.priceMinor };
      return <Card key={plan.id}><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">{plan.names.en ?? plan.code}</h2><p className="text-sm text-muted">{plan.code} · {plan.interval} · {plan.currency} · {plan.isActive ? "Active" : "Inactive"}</p></div><p className="text-xs text-muted">{Object.keys(plan.entitlements).length} entitlements</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Plan name (English)">{(id) => <input id={id} className={inputCls} disabled={role !== "SUPER_ADMIN"} value={value.name} onChange={(event) => setValues((prev) => ({ ...prev, [plan.code]: { ...value, name: event.target.value } }))} />}</Field><Field label="Price (santim)">{(id) => <input id={id} type="number" min="0" max="100000000" className={inputCls} disabled={role !== "SUPER_ADMIN"} value={value.priceMinor} onChange={(event) => setValues((prev) => ({ ...prev, [plan.code]: { ...value, priceMinor: Math.max(0, Number(event.target.value)) } }))} />}</Field></div>
        {role === "SUPER_ADMIN" && <Button className="mt-3" disabled={saving === plan.code || !value.name.trim()} onClick={() => void save(plan)}>{saving === plan.code ? "Saving…" : "Save plan"}</Button>}
      </Card>;
    })}</div>}
  </>;
}
