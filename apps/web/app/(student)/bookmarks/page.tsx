"use client";
import { DEMO } from "../../../lib/config";
import { LiveBookmarks } from "../../../features/live/Social";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button, Card, EmptyState, PageHeader } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { NOTES, TOPICS } from "../../../lib/mock";
import { getQ } from "../../../lib/exam";
function DemoP() {
  const { state, update } = useStore(); const rm = (type: string, id: string) => update((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => !(b.type === type && b.id === id)) }));
  const row = (type: "NOTE" | "QUESTION" | "TOPIC", id: string, label: string, href: string) => <Card key={type + id} className="flex items-center justify-between gap-3 !p-4"><Link href={href} className="min-w-0 flex-1 truncate font-medium underline">{label}</Link><button aria-label={`Remove ${label}`} className="min-h-[44px] min-w-[44px] p-2" onClick={() => rm(type, id)}><Trash2 size={16} /></button></Card>;
  const by = (t: string) => state.bookmarks.filter((b) => b.type === t);
  return <><PageHeader title="My Bookmarks" action={<Button href="/mistakes" variant="secondary">Questions I got wrong</Button>} />
    {!state.bookmarks.length ? <EmptyState title="Nothing saved yet" body="Bookmark notes, questions and topics to find them here." action={<Button href="/notes">Browse notes</Button>} /> : <div className="space-y-6">
      {(["NOTE", "QUESTION", "TOPIC"] as const).map((t) => by(t).length > 0 && <section key={t}><h2 className="mb-2 font-bold">{t === "NOTE" ? "Notes" : t === "QUESTION" ? "Questions" : "Topics to review later"}</h2><div className="space-y-2">{by(t).map((b) => t === "NOTE" ? row(t, b.id, NOTES.find((n) => n.id === b.id)?.title ?? b.id, `/notes/${b.id}`) : t === "QUESTION" ? row(t, b.id, getQ(b.id)?.text ?? b.id, `/practice?topic=${getQ(b.id)?.topicId}`) : row(t, b.id, TOPICS.find((x) => x.id === b.id)?.name ?? b.id, `/practice?topic=${b.id}`))}</div></section>)}</div>}</>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveBookmarks />; }
