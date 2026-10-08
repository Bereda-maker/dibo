"use client";
import { DEMO } from "../../../lib/config";
import { LiveNotes } from "../../../features/live/Learn";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Bookmark } from "lucide-react";
import { Card, EmptyState, PageHeader, inputCls } from "../../../components/ui";
import { NOTES, SUBJECTS, TOPICS, topicName } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
function DemoP() {
  const { state } = useStore(); const [q, setQ] = useState(""); const [sub, setSub] = useState("all");
  const list = NOTES.filter((n) => state.user!.subjects.includes(TOPICS.find((t) => t.id === n.topicId)!.subjectId)).filter((n) => sub === "all" || TOPICS.find((t) => t.id === n.topicId)!.subjectId === sub).filter((n) => (n.title + n.summary).toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader title="Short notes" sub="Clear, exam-focused summaries." />
    <div className="mb-4 flex flex-wrap gap-2"><input aria-label="Search notes" placeholder="Search notes" className={inputCls + " max-w-xs"} value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Subject" className={inputCls + " max-w-[200px]"} value={sub} onChange={(e) => setSub(e.target.value)}><option value="all">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    {list.length ? <div className="grid gap-4 sm:grid-cols-2">{list.map((n) => <Link key={n.id} href={`/notes/${n.id}`}><Card className="h-full hover:border-primary"><div className="flex justify-between"><span className="text-xs font-semibold text-accent">{topicName(n.topicId)}</span><span className="flex gap-1">{state.bookmarks.some((b) => b.id === n.id) && <Bookmark size={16} className="fill-accent text-accent" aria-label="Bookmarked" />}{state.notesDone.includes(n.id) && <CheckCircle2 size={16} className="text-success" aria-label="Completed" />}</span></div><h2 className="mt-1 font-bold">{n.title}</h2><p className="text-sm text-muted">{n.summary}</p></Card></Link>)}</div> : <EmptyState title="No notes match" body="Try a different search or subject." />}</>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveNotes />; }
