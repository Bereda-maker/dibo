"use client";
import { DEMO } from "../../../lib/config";
import { LiveAssistant } from "../../../features/live/Social";
import { useEffect, useRef, useState } from "react";
import { Send, Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Card, PageHeader, inputCls, useToast } from "../../../components/ui";
import { useStore, today, type ChatMsg } from "../../../lib/store";
import { NOTES, QUESTIONS, TOPICS, topicName } from "../../../lib/mock";
import { topicStats } from "../../../lib/analytics";
import { uid } from "../../../lib/exam";
import { ChatMessageContent } from "../../../components/ChatMessageContent";

const FREE_LIMIT = 5;
const MODES = [["Explain", "Explain: "], ["Simplify", "Simplify: "], ["Give an example", "Give me an example of "], ["Quiz me", "Quiz me on "], ["Study plan", "What should I study next?"]];
/** Demo retrieval: keyword overlap over approved notes and question explanations. The real API replaces this with server-side retrieval + the configured AI provider. */
function localAnswer(msg: string, weak: string[]): { text: string; sources: string[] } {
  const words = msg.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  if (/study next|what should i study|study plan/i.test(msg)) return { text: weak.length ? `Based on your results, start with ${weak.slice(0, 2).join(" and ")}. Read the short note first, then practice 15 questions at medium difficulty.` : "You do not have enough practice data yet. Take the diagnostic assessment, then I can recommend a plan.", sources: [] };
  const scored = NOTES.map((n) => ({ n, s: words.filter((w) => (n.title + n.summary + n.sections.map((x) => x.body).join(" ") + topicName(n.topicId)).toLowerCase().includes(w)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
  if (/quiz me/i.test(msg)) { const q = QUESTIONS.filter((x) => !scored || x.topicId === scored.n.topicId)[0]!; return { text: `Quick question: ${q.text}${q.options.length ? "\n" + q.options.map((o, i) => `${"ABCD"[i]}. ${o.text}`).join("\n") : ""}\n\nReply with your answer and I will explain it.`, sources: [] }; }
  if (!scored) return { text: "I could not find approved material for this in the platform, so I would rather not guess. Try naming a topic from your notes (for example 'quadratic equations' or 'Newton's second law'), or check your textbook.", sources: [] };
  const n = scored.n; return { text: `${n.summary} ${n.sections[0]!.body}${n.formulas.length ? `\n\nKey formula: ${n.formulas[0]}` : ""}${n.mistakes[0] ? `\n\nCommon mistake: ${n.mistakes[0]}` : ""}\n\n[Source: note “${n.title}”]`, sources: [n.id] };
}
function DemoP() {
  const { state, update, markActive } = useStore(); const toast = useToast(); const u = state.user!;
  const [cid, setCid] = useState<string | null>(state.conversations[0]?.id ?? null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const end = useRef<HTMLDivElement>(null);
  const conv = state.conversations.find((c) => c.id === cid); const used = state.aiUsage[today()] ?? 0; const limited = u.plan !== "PREMIUM" && used >= FREE_LIMIT;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [conv?.messages.length, busy]);
  const weak = topicStats(state).filter((t) => t.attempted >= 3 && t.correct / t.attempted < 0.6).map((t) => t.topicName);
  const send = (raw: string) => { const m = raw.trim().slice(0, 2000); if (!m || busy || limited) return; setText(""); setBusy(true);
    let id = cid; if (!id) { id = uid(); const nid = id; update((s) => ({ ...s, conversations: [{ id: nid, title: m.slice(0, 40), messages: [] }, ...s.conversations] })); setCid(id); }
    const target = id; const add = (msg: ChatMsg) => update((s) => ({ ...s, conversations: s.conversations.map((c) => c.id === target ? { ...c, messages: [...c.messages, msg] } : c) }));
    add({ role: "user", content: m }); update((s) => ({ ...s, aiUsage: { ...s.aiUsage, [today()]: (s.aiUsage[today()] ?? 0) + 1 } })); markActive();
    setTimeout(() => { const a = localAnswer(m, weak); add({ role: "assistant", content: a.text, sources: a.sources }); setBusy(false); }, 700); };
  return (<><PageHeader title="AI Study Assistant" sub="Answers come from approved Dibora notes. If I do not know, I will say so." />
    <div className="grid gap-4 md:grid-cols-[220px_1fr]"><aside aria-label="Conversations" className="space-y-2"><Button variant="secondary" className="w-full" onClick={() => setCid(null)}><Plus size={16} />New conversation</Button>
      {state.conversations.map((c) => <div key={c.id} className={"flex items-center gap-1 rounded-xl border p-1 " + (c.id === cid ? "border-primary" : "border-border")}><button className="min-h-[40px] flex-1 truncate px-2 text-left text-sm" onClick={() => setCid(c.id)}>{c.title}</button>
        <button aria-label="Rename" className="p-2" onClick={() => { const t = prompt("Rename conversation", c.title); if (t?.trim()) update((s) => ({ ...s, conversations: s.conversations.map((x) => x.id === c.id ? { ...x, title: t.trim().slice(0, 60) } : x) })); }}><Pencil size={14} /></button>
        <button aria-label="Delete" className="p-2" onClick={() => { update((s) => ({ ...s, conversations: s.conversations.filter((x) => x.id !== c.id) })); if (cid === c.id) setCid(null); toast("Conversation deleted", "info"); }}><Trash2 size={14} /></button></div>)}</aside>
      <Card className="flex min-h-[60vh] flex-col !p-0"><div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">{!conv?.messages.length && <div className="py-8 text-center text-sm text-muted"><p>Ask about any topic in your notes.</p><div className="mt-3 flex flex-wrap justify-center gap-2">{MODES.map(([l, p]) => <button key={l} className="min-h-[40px] rounded-full border border-border px-3 text-xs" onClick={() => p!.endsWith("?") ? send(p!) : setText(p!)}>{l}</button>)}</div></div>}
        {conv?.messages.map((m, i) => <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-white" : "max-w-[90%] rounded-2xl bg-border/40 px-4 py-2 text-sm"}>{m.role === "assistant" ? <ChatMessageContent content={m.content} /> : m.content}</div>)}{busy && <p className="text-sm text-muted">Thinking…</p>}<div ref={end} /></div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}><input aria-label="Message" maxLength={2000} className={inputCls} placeholder={limited ? "Daily free limit reached" : "Ask a question…"} value={text} onChange={(e) => setText(e.target.value)} disabled={limited} /><Button type="submit" aria-label="Send" disabled={limited || busy}><Send size={16} /></Button></form>
        <p className="px-4 pb-3 text-xs text-muted">{u.plan === "PREMIUM" ? "Premium: advanced assistant" : `${Math.max(0, FREE_LIMIT - used)} free messages left today`}{limited && <> · <a href="/pricing" className="underline">Upgrade</a></>}</p></Card></div></>); }

export default function Page() { return DEMO ? <DemoP /> : <LiveAssistant />; }
