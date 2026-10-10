"use client";
import { useMemo, useState } from "react";
import { BookOpen, Check, CircleAlert, ClipboardCheck, Eye, Plus, Search, Sparkles } from "lucide-react";
import { diagnosticUpsertSchema, questionUpsertSchema } from "@dibora/validation";
import { recommend } from "@dibora/core/recommendation";
import { Badge, Button, Card, EmptyState, ErrorState, Field, PageHeader, Skeleton, inputCls, useToast } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useApi } from "../../lib/useApi";

type Names = Record<string, string>;
type Subject = { id: string; grade: number; stream: string | null; slug: string; names: Names };
type Topic = { id: string; subjectId: string; slug: string; names: Names };
type BankQuestion = { id: string; subjectId: string; subjectName: string; topicId: string; topicName: string; difficulty: "EASY" | "MEDIUM" | "HARD"; type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "NUMERICAL"; text: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; source: string | null; createdAt: string };
type TopicCoverage = { topicId: string; topicName: string; subjectName: string; count: number };
type Diagnostic = { id: string; title: string; description: string | null; instructions: string | null; durationMinutes: number; questionCount: number; randomize: boolean; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; createdAt: string; questionIds: string[]; inactiveQuestionCount: number; coverage: TopicCoverage[] };
type BuilderData = { minimumQuestionsPerTopic: number; subjects: Subject[]; topics: Topic[]; questions: BankQuestion[]; diagnostics: Diagnostic[] };
type QuestionType = BankQuestion["type"];
type QuestionDraft = { subjectId: string; topicId: string; difficulty: BankQuestion["difficulty"]; type: QuestionType; text: string; explanation: string; options: string[]; correct: number; numericAnswer: string; numericTolerance: string; source: string };
const emptyQuestion = (): QuestionDraft => ({ subjectId: "", topicId: "", difficulty: "EASY", type: "MULTIPLE_CHOICE", text: "", explanation: "", options: ["", "", "", ""], correct: 0, numericAnswer: "", numericTolerance: "0", source: "" });
const nameOf = (names: Names, fallback: string) => names.en ?? Object.values(names)[0] ?? fallback;
const errMessage = (e: unknown, fallback: string) => e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

function scenario(topic: TopicCoverage, percent: number) {
  const attempted = topic.count;
  const correct = Math.round((attempted * percent) / 100);
  return recommend([{ topicId: topic.topicId, topicName: topic.topicName, subjectName: topic.subjectName, attempted, correct, recentAttempted: attempted, recentCorrect: correct, noteCompleted: false, daysSincePracticed: null }], 1)[0];
}

export default function AdminDiagnosticBuilder() {
  const data = useApi(() => api<BuilderData>("/admin/diagnostics/builder"));
  const toast = useToast();
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("30");
  const [randomize, setRandomize] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyDiagnostic, setBusyDiagnostic] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionDraft>(emptyQuestion);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const d = data.data;
  const filteredTopics = useMemo(() => d?.topics.filter((t) => !subjectFilter || t.subjectId === subjectFilter) ?? [], [d, subjectFilter]);
  const filteredQuestions = useMemo(() => (d?.questions ?? []).filter((q) => (!subjectFilter || q.subjectId === subjectFilter) && (!topicFilter || q.topicId === topicFilter) && (!difficultyFilter || q.difficulty === difficultyFilter) && (!search || q.text.toLowerCase().includes(search.toLowerCase()))), [d, subjectFilter, topicFilter, difficultyFilter, search]);
  const selectedQuestions = useMemo(() => (d?.questions ?? []).filter((q) => selectedIds.includes(q.id) && q.status === "PUBLISHED"), [d, selectedIds]);
  const selectedTopicCoverage = useMemo(() => {
    const counts = new Map<string, TopicCoverage>();
    for (const q of selectedQuestions) {
      const x = counts.get(q.topicId) ?? { topicId: q.topicId, topicName: q.topicName, subjectName: q.subjectName, count: 0 };
      x.count++;
      counts.set(q.topicId, x);
    }
    return [...counts.values()];
  }, [selectedQuestions]);
  const coverage = useMemo(() => {
    const counts = new Map<string, TopicCoverage>();
    for (const x of selectedTopicCoverage) counts.set(x.topicId, x);
    const visibleIds = new Set(filteredTopics.map((t) => t.id));
    const visible = filteredTopics.map((t) => counts.get(t.id) ?? { topicId: t.id, topicName: nameOf(t.names, t.slug), subjectName: nameOf(d?.subjects.find((s) => s.id === t.subjectId)?.names ?? {}, "Subject"), count: 0 });
    return [...selectedTopicCoverage.filter((x) => !visibleIds.has(x.topicId)), ...visible];
  }, [d, filteredTopics, selectedTopicCoverage]);
  const includedCoverage = selectedTopicCoverage;
  const minPerTopic = d?.minimumQuestionsPerTopic ?? 5;
  const questionSubject = questionForm.subjectId || d?.subjects[0]?.id || "";
  const qTopics = d?.topics.filter((t) => t.subjectId === questionSubject) ?? [];
  const questionTopic = questionForm.topicId || qTopics[0]?.id || "";
  const setCorrectOption = (index: number) => setQuestionForm((current) => ({ ...current, correct: index }));
  const setOptionText = (index: number, value: string) => setQuestionForm((current) => ({ ...current, options: current.options.map((option, i) => i === index ? value : option) }));

  const clearBuilder = () => { setEditingId(null); setTitle(""); setDescription(""); setInstructions(""); setDuration("30"); setRandomize(true); setSelectedIds([]); setError(""); };
  const toggleQuestion = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const loadDraft = (exam: Diagnostic) => {
    setEditingId(exam.id); setTitle(exam.title); setDescription(exam.description ?? ""); setInstructions(exam.instructions ?? ""); setDuration(String(exam.durationMinutes)); setRandomize(exam.randomize); setSelectedIds(exam.questionIds); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDiagnostic = async () => {
    setError("");
    const parsed = diagnosticUpsertSchema.safeParse({ title, description: description || undefined, instructions: instructions || undefined, durationMinutes: Number(duration), randomize, questionIds: selectedIds });
    if (!parsed.success) { setError(parsed.error.issues.map((x) => x.message).join(" ")); return; }
    setBusy(true);
    try {
      await api(editingId ? `/admin/diagnostics/${editingId}` : "/admin/diagnostics", { method: editingId ? "PATCH" : "POST", body: parsed.data });
      toast(editingId ? "Diagnostic draft updated" : "Diagnostic saved as draft");
      clearBuilder(); data.reload();
    } catch (e) { setError(errMessage(e, "Could not save diagnostic")); }
    finally { setBusy(false); }
  };

  const doDiagnosticAction = async (exam: Diagnostic, action: "publish" | "unpublish") => {
    setBusyDiagnostic(exam.id); setError("");
    try {
      await api(`/admin/diagnostics/${exam.id}/${action}`, { method: "POST", body: {} });
      toast(action === "publish" ? "Diagnostic published for students" : "Diagnostic unpublished"); data.reload();
    } catch (e) { setError(errMessage(e, `Could not ${action} diagnostic`)); }
    finally { setBusyDiagnostic(null); }
  };

  const createQuestion = async () => {
    setQuestionError("");
    const options = questionForm.type === "NUMERICAL" ? [] : questionForm.type === "TRUE_FALSE" ? ["True", "False"].map((text, index) => ({ text, isCorrect: questionForm.correct === index })) : questionForm.options.map((text, index) => ({ text, isCorrect: questionForm.correct === index }));
    const parsed = questionUpsertSchema.safeParse({ subjectId: questionSubject, topicId: questionTopic, difficulty: questionForm.difficulty, type: questionForm.type, text: questionForm.text, explanation: questionForm.explanation,
      options, numericAnswer: questionForm.type === "NUMERICAL" && questionForm.numericAnswer.trim() ? Number(questionForm.numericAnswer) : null, numericTolerance: Number(questionForm.numericTolerance) || 0, tags: [], source: questionForm.source.trim() || null });
    if (!parsed.success) { setQuestionError(parsed.error.issues.map((x) => x.message).join(" ")); return; }
    setQuestionBusy(true);
    try {
      await api("/admin/questions", { method: "POST", body: parsed.data });
      toast("Question saved as a draft. Review it in the bank before publishing."); setQuestionForm(emptyQuestion()); setQuestionFormOpen(false); data.reload();
    } catch (e) { setQuestionError(errMessage(e, "Could not create question")); }
    finally { setQuestionBusy(false); }
  };

  const publishQuestion = async (question: BankQuestion) => {
    setQuestionBusy(true); setQuestionError("");
    try { await api(`/admin/questions/${question.id}/publish`, { method: "POST", body: {} }); toast("Question published and available to the builder"); data.reload(); }
    catch (e) { setQuestionError(errMessage(e, "Could not publish question")); }
    finally { setQuestionBusy(false); }
  };

  if (data.loading && !d) return <><PageHeader title="Diagnostic Builder" sub="Build a curriculum-tagged assessment and preview its learning recommendations." /><Skeleton className="h-48" /></>;
  if (data.error && !d) return <ErrorState message={data.error.message} onRetry={data.reload} />;
  if (!d) return <EmptyState title="Diagnostic builder data is unavailable" action={<Button onClick={data.reload}>Retry</Button>} />;

  const publishedQuestionCount = d.questions.filter((x) => x.status === "PUBLISHED").length;
  const activeDiagnostic = d.diagnostics.find((x) => x.status === "PUBLISHED");
  const scopedCount = filteredQuestions.filter((x) => x.status === "PUBLISHED").length;
  const publishReady = includedCoverage.length > 0 && includedCoverage.every((x) => x.count >= minPerTopic);

  return <>
    <PageHeader title="Diagnostic Builder" sub="Assemble a trusted starting-point assessment, check topic coverage, and preview the recommendation rules." action={<Button variant="secondary" onClick={clearBuilder}>New draft</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card className="!p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Published questions</p><p className="mt-1 text-2xl font-bold">{publishedQuestionCount}</p><p className="mt-1 text-xs text-muted">Only published questions can be selected.</p></Card>
      <Card className="!p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Recommendation sample</p><p className="mt-1 text-2xl font-bold">{minPerTopic} per topic</p><p className="mt-1 text-xs text-muted">Matches the shared recommendation engine threshold.</p></Card>
      <Card className="!p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Student diagnostic</p><p className="mt-1 text-lg font-bold">{activeDiagnostic?.title ?? "Not published"}</p><p className="mt-1 text-xs text-muted">Only one diagnostic can be active for students.</p></Card>
    </div>

    {error && <div role="alert" className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}

    <Card className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck size={20} />{editingId ? "Edit diagnostic draft" : "Create a diagnostic draft"}</h2><p className="mt-1 text-sm text-muted">Diagnostics identify learning needs; they are not pass/fail exams. Publishing requires at least {minPerTopic} published questions in each included topic.</p></div>{editingId && <Badge tone="warning">Editing draft</Badge>}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Assessment title">{(id, props) => <input id={id} {...props} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Grade 12 starting-point diagnostic" />}</Field>
        <Field label="Time limit (minutes)" hint="Choose a realistic time for the number and difficulty of questions.">{(id, props) => <input id={id} {...props} type="number" min={5} max={300} className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value)} />}</Field>
        <Field label="Short description">{(id, props) => <input id={id} {...props} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Find your strongest and weakest topics." />}</Field>
        <label className="mt-6 flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />Randomize question order</label>
        <div className="sm:col-span-2"><Field label="Student instructions">{(id, props) => <textarea id={id} {...props} rows={2} className={inputCls} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Answer independently. Your results are used to guide your study plan." />}</Field></div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-border/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">1. Choose published questions</h3><p className="mt-1 text-xs text-muted">{selectedQuestions.length} selected · {scopedCount} published in current filter</p></div><div className="flex flex-wrap gap-2">
          <select aria-label="Filter by subject" className={inputCls + " min-w-44"} value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setTopicFilter(""); }}><option value="">All subjects</option>{d.subjects.map((s) => <option key={s.id} value={s.id}>{nameOf(s.names, s.slug)} · Grade {s.grade}{s.stream ? ` · ${s.stream}` : ""}</option>)}</select>
          <select aria-label="Filter by topic" className={inputCls + " min-w-40"} value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}><option value="">All topics</option>{filteredTopics.map((t) => <option key={t.id} value={t.id}>{nameOf(t.names, t.slug)}</option>)}</select>
          <select aria-label="Filter by difficulty" className={inputCls + " min-w-36"} value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
        </div></div>
        <div className="relative mt-3 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden /><input aria-label="Search question text" className={inputCls + " pl-9"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" /></div>
        <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-border">
          {filteredQuestions.length ? <ul className="divide-y divide-border">{filteredQuestions.map((q) => <li key={q.id} className="flex items-start gap-3 p-3">
            <input className="mt-1 h-4 w-4" type="checkbox" aria-label={`Select question: ${q.text}`} checked={selectedIds.includes(q.id)} disabled={q.status !== "PUBLISHED" && !selectedIds.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
            <div className="min-w-0 flex-1"><p className="font-medium">{q.text}</p><p className="mt-1 text-xs text-muted">{q.subjectName} → {q.topicName} · {q.difficulty} · {q.type.replaceAll("_", " ")}{q.source ? ` · ${q.source}` : ""}</p></div>
            <Badge tone={q.status === "PUBLISHED" ? "success" : "warning"}>{q.status}</Badge>
            {q.status === "DRAFT" && <Button variant="secondary" className="!min-h-9 !px-3 !py-1 text-xs" loading={questionBusy} onClick={() => publishQuestion(q)}>Publish</Button>}
          </li>)}</ul> : <div className="p-5 text-sm text-muted">No matching questions. Create a draft below or change filters.</div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Draft questions stay out of the student test until reviewed and published.</p><Button variant="secondary" onClick={() => { setQuestionError(""); setQuestionFormOpen((v) => !v); }}>{questionFormOpen ? "Close question form" : <><Plus size={16} /> Add question</>}</Button></div>
      </div>

      {questionFormOpen && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="flex items-center gap-2 font-semibold"><BookOpen size={18} />Add a question draft</h3>
          {!d.subjects.length || !d.topics.length ? (
            <p className="mt-2 text-sm text-muted">Publish a subject and at least one topic before adding questions.</p>
          ) : (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">Subject<select className={inputCls + " mt-1"} value={questionSubject} onChange={(e) => setQuestionForm((f) => ({ ...f, subjectId: e.target.value, topicId: "" }))}>{d.subjects.map((s) => <option key={s.id} value={s.id}>{nameOf(s.names, s.slug)}</option>)}</select></label>
                <label className="block text-sm">Topic<select className={inputCls + " mt-1"} value={questionTopic} onChange={(e) => setQuestionForm((f) => ({ ...f, topicId: e.target.value }))}>{qTopics.map((t) => <option key={t.id} value={t.id}>{nameOf(t.names, t.slug)}</option>)}</select></label>
                <label className="block text-sm">Difficulty<select className={inputCls + " mt-1"} value={questionForm.difficulty} onChange={(e) => setQuestionForm((f) => ({ ...f, difficulty: e.target.value as QuestionDraft["difficulty"] }))}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
                <label className="block text-sm">Question type<select className={inputCls + " mt-1"} value={questionForm.type} onChange={(e) => setQuestionForm((f) => ({ ...f, type: e.target.value as QuestionType }))}><option value="MULTIPLE_CHOICE">Multiple choice</option><option value="TRUE_FALSE">True / False</option><option value="NUMERICAL">Numerical</option></select></label>
                <label className="block text-sm sm:col-span-2">Question text<textarea rows={3} className={inputCls + " mt-1"} value={questionForm.text} onChange={(e) => setQuestionForm((f) => ({ ...f, text: e.target.value }))} /></label>
                {questionForm.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-2 sm:col-span-2">
                    {questionForm.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="diagnostic-correct-option" aria-label={`Option ${i + 1} is correct`} checked={questionForm.correct === i} onChange={() => setCorrectOption(i)} />
                        <input aria-label={`Option ${i + 1}`} className={inputCls} value={option} placeholder={`Option ${i + 1}`} onChange={(e) => setOptionText(i, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
                {questionForm.type === "TRUE_FALSE" && <label className="block text-sm">Correct answer<select className={inputCls + " mt-1"} value={String(questionForm.correct)} onChange={(e) => setQuestionForm((f) => ({ ...f, correct: Number(e.target.value) }))}><option value="0">True</option><option value="1">False</option></select></label>}
                {questionForm.type === "NUMERICAL" && (
                  <>
                    <label className="block text-sm">Correct numerical answer<input type="number" step="any" className={inputCls + " mt-1"} value={questionForm.numericAnswer} onChange={(e) => setQuestionForm((f) => ({ ...f, numericAnswer: e.target.value }))} /></label>
                    <label className="block text-sm">Accepted tolerance (±)<input type="number" min="0" step="any" className={inputCls + " mt-1"} value={questionForm.numericTolerance} onChange={(e) => setQuestionForm((f) => ({ ...f, numericTolerance: e.target.value }))} /></label>
                  </>
                )}
                <label className="block text-sm sm:col-span-2">Explanation shown after an attempt<textarea rows={2} className={inputCls + " mt-1"} value={questionForm.explanation} onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))} /></label>
                <label className="block text-sm">Source / reference (optional)<input className={inputCls + " mt-1"} value={questionForm.source} onChange={(e) => setQuestionForm((f) => ({ ...f, source: e.target.value }))} placeholder="Textbook, chapter, page" /></label>
              </div>
              {questionError && <p role="alert" className="mt-3 text-sm text-error">{questionError}</p>}
              <div className="mt-3 flex gap-2"><Button loading={questionBusy} onClick={createQuestion}>Save as draft</Button><Button variant="secondary" onClick={() => setQuestionFormOpen(false)}>Cancel</Button></div>
            </>
          )}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">2. Topic coverage check</h3><p className="mt-1 text-xs text-muted">Topics with zero selected questions are not included; included topics need {minPerTopic} questions for recommendation-ready coverage.</p></div><Badge tone={publishReady ? "success" : "warning"}>{publishReady ? "Coverage ready" : "Coverage needs work"}</Badge></div>
        {(subjectFilter || topicFilter || difficultyFilter || search) && <p className="mt-2 text-xs text-muted">Coverage and previews include every selected topic, even if its questions are outside the current bank filters.</p>}
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-border text-xs text-muted"><tr><th className="py-2 pr-3">Subject / topic</th><th className="py-2 pr-3">Selected</th><th className="py-2">Coverage</th></tr></thead><tbody>{coverage.map((x) => <tr key={x.topicId} className="border-b border-border/70"><td className="py-2 pr-3"><span className="text-muted">{x.subjectName} → </span>{x.topicName}</td><td className="py-2 pr-3">{x.count}{x.count > 0 ? ` / ${minPerTopic}` : ""}</td><td className="py-2">{x.count === 0 ? <Badge>Not included</Badge> : x.count < minPerTopic ? <Badge tone="warning">Add {minPerTopic - x.count} more</Badge> : <Badge tone="success"><Check size={12} className="mr-1 inline" />Recommendation-ready</Badge>}</td></tr>)}</tbody></table></div>
        {!includedCoverage.length && <p className="mt-3 flex items-center gap-2 text-sm text-warning"><CircleAlert size={16} />Select at least one published question to see recommendation scenarios.</p>}
      </div>

      {includedCoverage.length > 0 && <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <h3 className="flex items-center gap-2 font-semibold"><Sparkles size={18} />3. Recommendation preview</h3>
        <p className="mt-1 text-xs text-muted">Examples use the same recommendation engine as student results. Each scenario assumes a new student, no completed note, and answers at the stated level; small samples are rounded to whole questions.</p>
        <div className="mt-3 space-y-3">{includedCoverage.map((topic) => <div key={topic.topicId} className="rounded-xl border border-border bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{topic.subjectName} → {topic.topicName}</p><Badge tone={topic.count >= minPerTopic ? "success" : "warning"}>{topic.count < minPerTopic ? `Low confidence · ${topic.count}/${minPerTopic}` : `${topic.count} questions`}</Badge></div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">{[[30, "Needs support"], [60, "Developing"], [80, "Strong"]].map(([score, label]) => { const rec = scenario(topic, Number(score)); return <div key={String(score)} className="rounded-lg bg-border/20 p-3"><p className="text-xs font-semibold text-muted">{label} · {score}% correct</p>{rec ? <><div className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={rec.priority === "HIGH" ? "error" : rec.priority === "MEDIUM" ? "warning" : "muted"}>{rec.priority} priority</Badge><span className="text-sm font-semibold">{rec.action === "READ_NOTE" ? "Read a note first" : `Practice ${rec.questionCount} ${rec.difficulty.toLowerCase()}`}</span></div><p className="mt-1 text-xs text-muted">{rec.reason}</p></> : <p className="mt-1 text-sm text-muted">No preview available.</p>}</div>; })}</div>
        </div>)}</div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted"><Eye size={15} className="mt-0.5 shrink-0" />This is a transparent example, not a prediction. Student recommendations update as practice history grows.</p>
      </div>}

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-2"><Button loading={busy} disabled={!title.trim() || selectedQuestions.length === 0} onClick={saveDiagnostic}>{editingId ? "Save draft changes" : "Save diagnostic draft"}</Button>{editingId && <Button variant="secondary" onClick={clearBuilder}>Cancel editing</Button>}</div>
    </Card>

    <section aria-labelledby="diagnostics-list-title" className="space-y-3">
      <div><h2 id="diagnostics-list-title" className="text-xl font-bold">Saved diagnostics</h2><p className="mt-1 text-sm text-muted">Drafts are private to admins; students only see a published diagnostic.</p></div>
      {d.diagnostics.length ? d.diagnostics.map((exam) => {
        const ready = exam.inactiveQuestionCount === 0 && exam.coverage.length > 0 && exam.coverage.every((x) => x.count >= minPerTopic);
        const anotherPublished = d.diagnostics.some((x) => x.id !== exam.id && x.status === "PUBLISHED");
        return <Card key={exam.id} className="!p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{exam.title}</h3><Badge tone={exam.status === "PUBLISHED" ? "success" : exam.status === "DRAFT" ? "warning" : "muted"}>{exam.status}</Badge>{exam.status === "PUBLISHED" && <Badge tone="info">Student live</Badge>}</div><p className="mt-1 text-sm text-muted">{exam.questionCount} questions · {exam.durationMinutes} min · {exam.coverage.length} topics · Created {new Date(exam.createdAt).toLocaleDateString()}</p></div>
          <div className="flex flex-wrap gap-2">{exam.status === "DRAFT" && <><Button variant="secondary" className="!min-h-9 !px-3 !py-1 text-xs" onClick={() => loadDraft(exam)}>Edit draft</Button><Button className="!min-h-9 !px-3 !py-1 text-xs" loading={busyDiagnostic === exam.id} disabled={!ready || anotherPublished} onClick={() => doDiagnosticAction(exam, "publish")}>Publish</Button></>}{exam.status === "PUBLISHED" && <Button variant="secondary" className="!min-h-9 !px-3 !py-1 text-xs" loading={busyDiagnostic === exam.id} onClick={() => doDiagnosticAction(exam, "unpublish")}>Unpublish</Button>}</div></div>
          {exam.status === "DRAFT" && !ready && <p className="mt-3 flex items-start gap-2 text-xs text-warning"><CircleAlert size={15} className="mt-0.5 shrink-0" />Add at least {minPerTopic} published questions for every included topic before publishing.</p>}
          {exam.inactiveQuestionCount > 0 && <p className="mt-2 text-xs text-warning">Replace or remove {exam.inactiveQuestionCount} question(s) that are no longer published.</p>}
          {exam.status === "DRAFT" && anotherPublished && <p className="mt-2 text-xs text-muted">Unpublish the current live diagnostic before publishing this draft.</p>}
          {exam.coverage.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{exam.coverage.map((x) => <Badge key={x.topicId} tone={x.count >= minPerTopic ? "success" : "warning"}>{x.topicName}: {x.count}/{minPerTopic}</Badge>)}</div>}
        </Card>;
      }) : <EmptyState title="No diagnostic drafts yet" body="Create a draft from published questions, review the recommendation preview, then publish when topic coverage is ready." />}
    </section>
  </>;
}
