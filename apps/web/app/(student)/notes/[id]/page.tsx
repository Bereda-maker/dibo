"use client";
import { DEMO } from "../../../../lib/config";
import { LiveNoteRoute } from "../../../../features/live/Pages";
import { useParams } from "next/navigation";
import { Bookmark, CheckCircle2, Clock } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, useToast } from "../../../../components/ui";
import { NOTES, topicName } from "../../../../lib/mock";
import { useStore } from "../../../../lib/store";
function DemoP() {
  const { id } = useParams<{ id: string }>(); const { state, update, markActive } = useStore(); const toast = useToast(); const n = NOTES.find((x) => x.id === id);
  if (!n) return <EmptyState title="Note not found" action={<Button href="/notes">All notes</Button>} />;
  const done = state.notesDone.includes(n.id), marked = state.bookmarks.some((b) => b.type === "NOTE" && b.id === n.id), later = state.bookmarks.some((b) => b.type === "TOPIC" && b.id === n.topicId);
  const Sec = ({ t, items }: { t: string; items: string[] }) => items.length ? <Card className="mt-4"><h2 className="font-bold">{t}</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul></Card> : null;
  return <><PageHeader title={n.title} sub={n.summary} action={<div className="flex gap-2"><Button variant="secondary" aria-pressed={marked} onClick={() => update((s) => ({ ...s, bookmarks: marked ? s.bookmarks.filter((b) => !(b.type === "NOTE" && b.id === n.id)) : [...s.bookmarks, { type: "NOTE", id: n.id }] }))}><Bookmark size={16} className={marked ? "fill-accent" : ""} />{marked ? "Saved" : "Bookmark"}</Button></div>} />
    <Badge tone="info">{topicName(n.topicId)}</Badge>
    {n.sections.map((s) => <Card key={s.heading} className="mt-4"><h2 className="font-bold">{s.heading}</h2><p className="mt-2 text-sm leading-relaxed">{s.body}</p></Card>)}
    {n.formulas.length > 0 && <Card className="mt-4"><h2 className="font-bold">Formulas</h2><ul className="mt-2 space-y-1 font-mono text-sm">{n.formulas.map((f) => <li key={f} className="rounded-lg bg-border/40 px-3 py-2">{f}</li>)}</ul></Card>}
    <Sec t="Key points" items={n.keyPoints} /><Sec t="Common mistakes" items={n.mistakes} /><Sec t="Exam tips" items={n.tips} />
    <div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => { if (!done) { update((s) => ({ ...s, notesDone: [...s.notesDone, n.id] })); markActive(); } toast("Marked as completed"); }} disabled={done}><CheckCircle2 size={16} />{done ? "Completed" : "Mark completed"}</Button>
      <Button variant="secondary" onClick={() => { update((s) => ({ ...s, bookmarks: later ? s.bookmarks : [...s.bookmarks, { type: "TOPIC", id: n.topicId }] })); toast("Added to review later", "info"); }}><Clock size={16} />Review later</Button><Button href={`/practice?topic=${n.topicId}`} variant="secondary">Practice this topic</Button><Button href="/assistant" variant="ghost">Ask the AI</Button></div></>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveNoteRoute />; }
