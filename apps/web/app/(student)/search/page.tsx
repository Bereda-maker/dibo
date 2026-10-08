"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Badge, EmptyState, PageHeader, inputCls, cx } from "../../../components/ui";
import { SUBJECTS, TOPICS, NOTES, QUESTIONS, EXAMS, topicName } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
type Hit = { kind: string; title: string; sub?: string; href: string };
const all = (): Hit[] => [...SUBJECTS.map((s) => ({ kind: "Subject", title: s.name, href: `/practice?subject=${s.id}` })), ...TOPICS.map((t) => ({ kind: "Topic", title: t.name, href: `/practice?topic=${t.id}` })),
  ...NOTES.map((n) => ({ kind: "Note", title: n.title, sub: n.summary, href: `/notes/${n.id}` })), ...QUESTIONS.map((q) => ({ kind: "Question", title: q.text, sub: topicName(q.topicId), href: `/practice?topic=${q.topicId}` })), ...EXAMS.map((e) => ({ kind: "Exam", title: e.title, sub: e.description, href: `/exams/${e.id}` }))];
export default function P() {
  const { state, update } = useStore(); const [q, setQ] = useState(""); const [kind, setKind] = useState("All"); const index = useMemo(all, []);
  const hits = q.trim().length < 2 ? [] : index.filter((h) => (kind === "All" || h.kind === kind) && (h.title + " " + (h.sub ?? "")).toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const remember = () => q.trim().length > 1 && update((s) => ({ ...s, recentSearches: [q.trim(), ...s.recentSearches.filter((x) => x !== q.trim())].slice(0, 6) }));
  return <><PageHeader title="Search" /><form role="search" onSubmit={(e) => { e.preventDefault(); remember(); }} className="relative"><SearchIcon size={18} className="absolute left-3 top-3.5 text-muted" aria-hidden /><input list="sugg" autoFocus aria-label="Search subjects, topics, notes, questions and exams" className={inputCls + " pl-10"} placeholder="Search notes, topics, questions, exams…" value={q} onChange={(e) => setQ(e.target.value)} onBlur={remember} />
    <datalist id="sugg">{[...SUBJECTS.map((s) => s.name), ...TOPICS.map((t) => t.name)].map((s) => <option key={s} value={s} />)}</datalist></form>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter results">{["All", "Subject", "Topic", "Note", "Question", "Exam"].map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={cx("min-h-[40px] rounded-full border px-3 text-sm", kind === k ? "border-primary bg-primary text-white" : "border-border")}>{k}</button>)}</div>
    {q.trim().length < 2 ? (state.recentSearches.length ? <div className="mt-6"><div className="flex justify-between"><h2 className="font-bold">Recent searches</h2><button className="text-sm underline" onClick={() => update((s) => ({ ...s, recentSearches: [] }))}>Clear</button></div><div className="mt-2 flex flex-wrap gap-2">{state.recentSearches.map((r) => <button key={r} onClick={() => setQ(r)} className="flex min-h-[40px] items-center gap-1 rounded-full border border-border px-3 text-sm">{r}<X size={12} aria-hidden /></button>)}</div></div> : <p className="mt-6 text-sm text-muted">Type at least 2 letters to search.</p>) :
      hits.length ? <ul className="mt-4 space-y-2">{hits.map((h, i) => <li key={i}><Link href={h.href} className="block rounded-card border border-border bg-surface p-4 hover:border-primary"><Badge tone="info">{h.kind}</Badge><p className="mt-1 font-semibold">{h.title}</p>{h.sub && <p className="text-sm text-muted">{h.sub}</p>}</Link></li>)}</ul> : <div className="mt-6"><EmptyState title={`No results for “${q}”`} body="Check the spelling or try a broader word like “algebra”." /></div>}</>; }
