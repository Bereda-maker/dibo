"use client";
import { DEMO } from "../../../lib/config";
import { LiveAssistant } from "../../../features/live/Social";
import { useEffect, useRef, useState } from "react";
import { Copy, Send, Plus, Pencil, Trash2 } from "lucide-react";
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
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [cid, conv?.messages.length, busy]);
  const copyReply = async (content: string) => { try { await navigator.clipboard.writeText(content); toast("Answer copied", "info"); } catch { toast("Clipboard access is unavailable in this browser", "error"); } };
  const weak = topicStats(state).filter((t) => t.attempted >= 3 && t.correct / t.attempted < 0.6).map((t) => t.topicName);
  const send = (raw: string) => { const m = raw.trim().slice(0, 2000); if (!m || busy || limited) return; setText(""); setBusy(true);
    let id = cid; if (!id) { id = uid(); const nid = id; update((s) => ({ ...s, conversations: [{ id: nid, title: m.slice(0, 40), messages: [] }, ...s.conversations] })); setCid(id); }
    const target = id; const add = (msg: ChatMsg) => update((s) => ({ ...s, conversations: s.conversations.map((c) => c.id === target ? { ...c, messages: [...c.messages, msg] } : c) }));
    add({ role: "user", content: m }); update((s) => ({ ...s, aiUsage: { ...s.aiUsage, [today()]: (s.aiUsage[today()] ?? 0) + 1 } })); markActive();
    setTimeout(() => { const a = localAnswer(m, weak); add({ role: "assistant", content: a.text, sources: a.sources }); setBusy(false); }, 700); };
  return (<><PageHeader title="AI Study Assistant" sub="Answers come from approved Dibora notes. If I do not know, I will say so." />
    <div className="grid min-w-0 gap-4 md:grid-cols-[220px_minmax(0,1fr)]"><aside aria-label="Conversations" className="min-w-0 space-y-2"><Button variant="secondary" className="w-full" onClick={() => setCid(null)}><Plus size={16} />New conversation</Button>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">{state.conversations.map((c) => <div key={c.id} className={"flex min-w-[220px] shrink-0 items-center gap-1 rounded-xl border p-1 md:min-w-0 " + (c.id === cid ? "border-primary bg-primary/5" : "border-border")}><button className="min-h-[40px] min-w-0 flex-1 truncate px-2 text-left text-sm" onClick={() => setCid(c.id)}>{c.title}</button>
        <button aria-label={`Rename ${c.title}`} className="grid min-h-10 min-w-10 place-items-center rounded-lg p-2 hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { const t = prompt("Rename conversation", c.title); if (t?.trim()) update((s) => ({ ...s, conversations: s.conversations.map((x) => x.id === c.id ? { ...x, title: t.trim().slice(0, 60) } : x) })); }}><Pencil size={14} /></button>
        <button aria-label={`Delete ${c.title}`} className="grid min-h-10 min-w-10 place-items-center rounded-lg p-2 hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { update((s) => ({ ...s, conversations: s.conversations.filter((x) => x.id !== c.id) })); if (cid === c.id) setCid(null); toast("Conversation deleted", "info"); }}><Trash2 size={14} /></button></div>)}</div></aside>
      <Card className="flex h-[55dvh] min-h-[340px] min-w-0 flex-col !p-0 md:h-[min(72dvh,900px)] md:min-h-[420px]"><div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4" aria-live="polite">{!conv?.messages.length && <div className="py-8 text-center text-sm text-muted"><p>Ask about any topic in your notes.</p><div className="mt-3 flex flex-wrap justify-center gap-2">{MODES.map(([l, p]) => <button key={l} className="min-h-[44px] rounded-full border border-border px-3 text-xs hover:border-primary hover:text-primary" onClick={() => p!.endsWith("?") ? send(p!) : setText(p!)}>{l}</button>)}</div></div>}
        {conv?.messages.map((m, i) => <div key={i} className={m.role === "user" ? "ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[85%]" : "max-w-[96%] break-words rounded-2xl rounded-bl-md bg-border/40 px-4 py-3 text-sm leading-relaxed sm:max-w-[92%]"}>{m.role === "assistant" ? <><ChatMessageContent content={m.content} /><button type="button" aria-label="Copy assistant answer" title="Copy answer" onClick={() => void copyReply(m.content)} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-border/60 hover:text-text focus-visible:ring-2 focus-visible:ring-primary"><Copy size={14} aria-hidden />Copy</button></> : m.content}</div>)}{busy && <p role="status" className="flex items-center gap-2 px-2 text-sm text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Dibora is thinking…</p>}<div ref={end} /></div>
        <form className="flex items-end gap-2 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" onSubmit={(e) => { e.preventDefault(); send(text); }}><label htmlFor="demo-assistant-message" className="sr-only">Message</label><textarea id="demo-assistant-message" rows={2} maxLength={2000} className={inputCls + " max-h-32 min-h-[52px] resize-y leading-5"} placeholder={limited ? "Daily free limit reached" : "Ask a question… (Enter for a new line)"} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} disabled={limited} aria-describedby="demo-assistant-message-hint" /><span id="demo-assistant-message-hint" className="sr-only">Press Control or Command plus Enter to send.</span><Button type="submit" aria-label="Send message" disabled={limited || busy || !text.trim()} className="shrink-0"><Send size={16} aria-hidden /></Button></form>
        <p className="px-4 pb-3 text-xs text-muted">{u.plan === "PREMIUM" ? "Premium: advanced assistant" : `${Math.max(0, FREE_LIMIT - used)} free messages left today`}{limited && <> · <a href="/pricing" className="underline">Upgrade</a></>}</p></Card></div></>); }

export default function Page() { return DEMO ? <DemoP /> : <LiveAssistant />; }
