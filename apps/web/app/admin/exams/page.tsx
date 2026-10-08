"use client";
import { useState } from "react";
import { Button, Card, Field, PageHeader, Skeleton, inputCls, useToast } from "../../../components/ui";
import { StatusTable } from "../../../components/StatusTable";
import { DataTable } from "../../../components/DataTable";
import { useAdmin, type Status } from "../../../lib/admin";
import { SUBJECTS, TOPICS } from "../../../lib/mock";
export default function P() {
  const { d, set } = useAdmin(); const toast = useToast(); const [open, setOpen] = useState(false); const [err, setErr] = useState("");
  const [f, setF] = useState({ title: "", subject: "all", topic: "all", difficulty: "all", count: 10, minutes: 20, random: true, limit: 3, premium: false });
  if (!d) return <Skeleton className="h-60" />;
  const pool = d.questions.filter((q) => q.status === "PUBLISHED" && (f.subject === "all" || q.subjectId === f.subject) && (f.topic === "all" || q.topicId === f.topic) && (f.difficulty === "all" || q.difficulty === f.difficulty));
  const create = () => { if (f.title.trim().length < 3) return setErr("Give the exam a title"); if (pool.length < f.count) return setErr(`Only ${pool.length} published questions match. Lower the count or widen filters.`); if (f.minutes < 1) return setErr("Duration must be at least 1 minute"); setErr("");
    set((x) => ({ ...x, exams: [{ id: "ex" + Date.now(), title: f.title.trim(), type: f.topic !== "all" ? "TOPIC" : f.subject !== "all" ? "SUBJECT" : "MOCK", minutes: f.minutes, count: f.count, status: "DRAFT", premium: f.premium }, ...x.exams] }), `Created exam ${f.title}`); toast("Exam saved as draft"); setOpen(false); };
  return <><PageHeader title="Exams & results" action={<Button onClick={() => setOpen(!open)}>{open ? "Close builder" : "Build exam"}</Button>} />
    {open && <Card className="mb-6"><h2 className="font-bold">Exam builder</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3"><Field label="Title">{(id) => <input id={id} className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field></div>
      <Field label="Subject">{(id) => <select id={id} className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value, topic: "all" })}><option value="all">All</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</Field>
      <Field label="Topic">{(id) => <select id={id} className={inputCls} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}><option value="all">All</option>{TOPICS.filter((t) => f.subject === "all" || t.subjectId === f.subject).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</Field>
      <Field label="Difficulty">{(id) => <select id={id} className={inputCls} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="all">Any</option><option>EASY</option><option>MEDIUM</option><option>HARD</option></select>}</Field>
      <Field label="Number of questions" hint={`${pool.length} available`}>{(id) => <input id={id} type="number" min={1} className={inputCls} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} />}</Field>
      <Field label="Duration (minutes)">{(id) => <input id={id} type="number" min={1} className={inputCls} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} />}</Field>
      <Field label="Attempt limit">{(id) => <input id={id} type="number" min={1} className={inputCls} value={f.limit} onChange={(e) => setF({ ...f, limit: Number(e.target.value) })} />}</Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.random} onChange={(e) => setF({ ...f, random: e.target.checked })} />Randomize questions</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.premium} onChange={(e) => setF({ ...f, premium: e.target.checked })} />Premium only</label></div>
      {err && <p role="alert" className="mt-3 text-sm text-error">{err}</p>}<div className="mt-4 flex gap-2"><Button onClick={create}>Save draft</Button></div>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Preview ({Math.min(f.count, pool.length)} questions)</summary><ol className="mt-2 list-decimal pl-5">{pool.slice(0, f.count).map((q) => <li key={q.id}>{q.text}</li>)}</ol></details></Card>}
    <StatusTable rows={d.exams} cols={[{ key: "t", label: "Title", render: (r) => r.title }, { key: "ty", label: "Type", render: (r) => r.type }, { key: "c", label: "Questions", render: (r) => r.count }, { key: "m", label: "Minutes", render: (r) => r.minutes }, { key: "p", label: "Premium", render: (r) => (r.premium ? "Yes" : "No") }]}
      onChange={(ids, s: Status) => { set((x) => ({ ...x, exams: x.exams.map((e) => ids.includes(e.id) ? { ...e, status: s } : e) }), `Set ${ids.length} exams to ${s}`); toast(`${ids.length} → ${s}`); }} onDelete={(ids) => set((x) => ({ ...x, exams: x.exams.filter((e) => !ids.includes(e.id)) }), `Deleted ${ids.length} exams`)} />
    <h2 className="mb-2 mt-8 font-bold">Recent results (sample)</h2><Card><DataTable rows={[{ id: "1", s: "Selam T.", e: "Mock 1", p: 78 }, { id: "2", s: "Dawit M.", e: "Mock 1", p: 64 }, { id: "3", s: "Hana B.", e: "Diagnostic", p: 71 }]} cols={[{ key: "s", label: "Student", render: (r) => r.s }, { key: "e", label: "Exam", render: (r) => r.e }, { key: "p", label: "Score", render: (r) => `${r.p}%` }]} /></Card></>; }
