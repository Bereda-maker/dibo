"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, Bell, Check, Download, Lock, Pencil, Plus, Search as SearchIcon, Send, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, cx, inputCls, useToast } from "../../components/ui";
import { api, ApiError, fieldErrors } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { REGIONS } from "../../lib/config";
import { Async, diffTone } from "./shared";

type Bm = { type: "NOTE" | "QUESTION" | "TOPIC"; id: string; title: string; topicId?: string };
export function LiveBookmarks() {
  const q = useApi(() => api<Bm[]>("/bookmarks"));
  return <><PageHeader title="My Bookmarks" action={<Button href="/mistakes" variant="secondary">Questions I got wrong</Button>} /><Async q={q}>{(rows) => !rows.length ? <EmptyState title="Nothing saved yet" body="Bookmark notes, questions and topics to find them here." action={<Button href="/notes">Browse notes</Button>} /> :
    <div className="space-y-6">{(["NOTE", "QUESTION", "TOPIC"] as const).map((t) => rows.some((r) => r.type === t) && <section key={t}><h2 className="mb-2 font-bold">{t === "NOTE" ? "Notes" : t === "QUESTION" ? "Questions" : "Topics to review later"}</h2><div className="space-y-2">{rows.filter((r) => r.type === t).map((b) => <Card key={b.type + b.id} className="flex items-center justify-between gap-3 !p-4"><Link className="min-w-0 flex-1 truncate font-medium underline" href={b.type === "NOTE" ? `/notes/${b.id}` : `/practice?mode=topic&topic=${b.topicId}`}>{b.title}</Link>
      <button aria-label={`Remove ${b.title}`} className="min-h-[44px] min-w-[44px] p-2" onClick={async () => { await api("/bookmarks", { method: "DELETE", body: { type: b.type, id: b.id } }); q.reload(); }}><Trash2 size={16} /></button></Card>)}</div></section>)}</div>}</Async></>;
}

type Wrong = { id: string; text: string; difficulty: string; correctAnswer: string | null; explanation: string };
export function LiveMistakes() {
  const q = useApi(() => api<Wrong[]>("/practice/wrong"));
  return <><PageHeader title="Questions I Got Wrong" sub="Your revision area. Questions leave this list when you answer them correctly." action={<Button href="/practice?mode=wrong">Practice these</Button>} /><Async q={q}>{(rows) => !rows.length ? <EmptyState title="No mistakes to review" body="Answer some questions and anything you miss will appear here." action={<Button href="/practice">Start practice</Button>} /> :
    <div className="space-y-3">{rows.map((w) => <Card key={w.id}><p className="font-semibold">{w.text}</p><p className="mt-1 text-sm">Correct answer: <b className="text-success">{w.correctAnswer}</b></p><p className="mt-1 text-sm text-muted">{w.explanation}</p><div className="mt-2"><Badge tone={diffTone(w.difficulty)}>{w.difficulty}</Badge></div></Card>)}</div>}</Async></>;
}

type Conv = { id: string; title: string }; type Msg = { role: "user" | "assistant"; content: string };
export function LiveAssistant() {
  const toast = useToast(); const convs = useApi(() => api<Conv[]>("/ai/conversations")); const [cid, setCid] = useState<string | null>(null); const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [limit, setLimit] = useState(false); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);
  const open = async (id: string | null) => { setCid(id); setMsgs(id ? await api<Msg[]>(`/ai/conversations/${id}/messages`).catch(() => []) : []); };
  const send = async (raw: string) => { const m = raw.trim(); if (!m || busy) return; setText(""); setBusy(true); setMsgs((x) => [...x, { role: "user", content: m }]);
    try { const r = await api<{ conversationId: string; reply: string }>("/ai/messages", { method: "POST", body: { message: m, conversationId: cid ?? undefined } }); setMsgs((x) => [...x, { role: "assistant", content: r.reply }]); if (!cid) { setCid(r.conversationId); convs.reload(); } }
    catch (e) { setMsgs((x) => x.slice(0, -1)); if (e instanceof ApiError && e.code === "DAILY_LIMIT") setLimit(true); else toast(e instanceof ApiError ? e.message : "The assistant is unavailable. Try again.", "error"); } finally { setBusy(false); } };
  return <><PageHeader title="AI Study Assistant" sub="Answers come from approved Dibora notes. If I do not know, I will say so." /><div className="grid gap-4 md:grid-cols-[220px_1fr]">
    <aside aria-label="Conversations" className="space-y-2"><Button variant="secondary" className="w-full" onClick={() => open(null)}><Plus size={16} />New conversation</Button>{convs.loading && <Skeleton className="h-10" />}
      {(convs.data ?? []).map((c) => <div key={c.id} className={cx("flex items-center gap-1 rounded-xl border p-1", c.id === cid ? "border-primary" : "border-border")}><button className="min-h-[40px] flex-1 truncate px-2 text-left text-sm" onClick={() => open(c.id)}>{c.title}</button>
        <button aria-label="Rename" className="p-2" onClick={async () => { const t = prompt("Rename conversation", c.title); if (t?.trim()) { await api(`/ai/conversations/${c.id}`, { method: "PATCH", body: { title: t.trim() } }); convs.reload(); } }}><Pencil size={14} /></button>
        <button aria-label="Delete" className="p-2" onClick={async () => { await api(`/ai/conversations/${c.id}`, { method: "DELETE" }); if (cid === c.id) open(null); convs.reload(); toast("Conversation deleted", "info"); }}><Trash2 size={14} /></button></div>)}</aside>
    <Card className="flex min-h-[60vh] flex-col !p-0"><div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">{!msgs.length && <p className="py-8 text-center text-sm text-muted">Ask about any topic in your notes.</p>}{msgs.map((m, i) => <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-white" : "max-w-[90%] whitespace-pre-line rounded-2xl bg-border/40 px-4 py-2 text-sm"}>{m.content}</div>)}{busy && <p className="text-sm text-muted">Thinking…</p>}<div ref={end} /></div>
      {limit ? <p className="border-t border-border p-3 text-sm">You have used today&apos;s free messages. <Link href="/pricing" className="underline">Upgrade for more</Link>.</p> : <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void send(text); }}><input aria-label="Message" maxLength={2000} className={inputCls} placeholder="Ask a question…" value={text} onChange={(e) => setText(e.target.value)} /><Button type="submit" aria-label="Send" disabled={busy}><Send size={16} /></Button></form>}</Card></div></>;
}

type Notif = { id: string; title: string; body: string | null; readAt: string | null };
export function LiveNotifications() {
  const q = useApi(() => api<Notif[]>("/notifications"));
  return <><PageHeader title="Notifications" action={<Button variant="secondary" onClick={async () => { await api("/notifications/read-all", { method: "POST", body: {} }); q.reload(); }}>Mark all read</Button>} /><Async q={q}>{(rows) => rows.length ? <div className="space-y-2">{rows.map((n) => <Card key={n.id} className={cx("flex gap-3 !p-4", n.readAt && "opacity-60")}><Bell size={18} className="mt-0.5 text-accent" aria-hidden /><div><p className="font-semibold">{n.title}</p><p className="text-sm text-muted">{n.body}</p></div></Card>)}</div> : <EmptyState title="You're all caught up" />}</Async></>;
}
type Ach = { code: string; names: Record<string, string>; points: number; unlockedAt: string | null };
export function LiveAchievements() {
  const q = useApi(() => api<Ach[]>("/achievements"));
  return <Async q={q}>{(rows) => <><PageHeader title="Achievements" sub={`${rows.filter((r) => r.unlockedAt).length} of ${rows.length} unlocked`} /><div className="grid gap-3 sm:grid-cols-2">{rows.map((a) => <Card key={a.code} className={cx("flex items-center gap-4 !p-4", !a.unlockedAt && "opacity-60")}>{a.unlockedAt ? <Award className="text-accent" size={28} aria-hidden /> : <Lock size={28} className="text-muted" aria-hidden />}<div><p className="font-bold">{a.names.en}</p><p className="text-sm text-muted">{a.points} points</p><p className="sr-only">{a.unlockedAt ? "Unlocked" : "Locked"}</p></div></Card>)}</div></>}</Async>;
}
type Lb = { rank: number; name: string; points: number };
export function LiveLeaderboard() {
  const { profile, refresh } = useSession(); const [period, setPeriod] = useState("weekly"); const q = useApi(() => api<Lb[]>(`/leaderboard?period=${period}`), [period]); const opt = profile?.leaderboardOptIn;
  const toggle = async (v: boolean) => { await api("/students/me", { method: "PATCH", body: { leaderboardOptIn: v } }); await refresh(); q.reload(); };
  return <><PageHeader title="Leaderboard" sub="Optional and private by default. Only display names and points are shown." /><div className="mb-4 flex gap-2" role="group" aria-label="Period">{["weekly", "monthly", "overall"].map((r) => <button key={r} aria-pressed={period === r} onClick={() => setPeriod(r)} className={cx("min-h-[44px] rounded-xl border px-4 text-sm capitalize", period === r ? "border-primary bg-primary text-white" : "border-border")}>{r}</button>)}</div>
    {!opt && <Card className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">You are hidden from the leaderboard.</p><Button onClick={() => toggle(true)}>Join leaderboard</Button></Card>}
    <Async q={q}>{(rows) => rows.length ? <Card><ol>{rows.map((r) => <li key={r.rank} className="flex justify-between border-b border-border/60 py-3 last:border-0"><span><span className="mr-3 inline-block w-6 text-muted">{r.rank}</span>{r.name}</span><span>{r.points} pts</span></li>)}</ol></Card> : <EmptyState title="No one on the leaderboard yet" />}</Async>
    {opt && <Button variant="ghost" className="mt-3" onClick={() => toggle(false)}>Opt out of leaderboard</Button>}</>;
}

type Hit = { kind: string; id: string; title: string; sub?: string | null };
export function LiveSearch() {
  const [q, setQ] = useState(""); const [kind, setKind] = useState("All"); const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const r = useApi(() => (dq.length >= 2 ? api<Hit[]>(`/search?q=${encodeURIComponent(dq)}`) : Promise.resolve([] as Hit[])), [dq]);
  const hits = (r.data ?? []).filter((h) => kind === "All" || h.kind === kind.toLowerCase());
  const href = (h: Hit) => h.kind === "note" ? `/notes/${h.id}` : h.kind === "exam" ? `/exams/${h.id}` : h.kind === "topic" ? `/practice?mode=topic&topic=${h.id}` : "/practice";
  return <><PageHeader title="Search" /><div className="relative"><SearchIcon size={18} className="absolute left-3 top-3.5 text-muted" aria-hidden /><input autoFocus aria-label="Search subjects, topics, notes, questions and exams" className={inputCls + " pl-10"} placeholder="Search notes, topics, questions, exams…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter results">{["All", "Subject", "Topic", "Note", "Question", "Exam"].map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={cx("min-h-[40px] rounded-full border px-3 text-sm", kind === k ? "border-primary bg-primary text-white" : "border-border")}>{k}</button>)}</div>
    {dq.length < 2 ? <p className="mt-6 text-sm text-muted">Type at least 2 letters to search.</p> : r.error ? <p role="alert" className="mt-6 text-sm text-error">Search failed. <button className="underline" onClick={r.reload}>Retry</button></p> : r.loading ? <Skeleton className="mt-4 h-24" /> : hits.length ? <ul className="mt-4 space-y-2">{hits.map((h) => <li key={h.kind + h.id}><Link href={href(h)} className="block rounded-card border border-border bg-surface p-4 hover:border-primary"><Badge tone="info">{h.kind}</Badge><p className="mt-1 font-semibold">{h.title}</p>{h.sub && <p className="text-sm text-muted">{h.sub}</p>}</Link></li>)}</ul> : <div className="mt-6"><EmptyState title={`No results for “${dq}”`} body="Check the spelling or try a broader word." /></div>}</>;
}

type Subj = { id: string; names: Record<string, string> };
function ProfileInner() {
  const { profile, refresh, logout } = useSession(); const toast = useToast(); const router = useRouter(); const welcome = useSearchParams().get("welcome"); const subjects = useApi(() => api<Subj[]>("/content/subjects"));
  const p = profile!; const [f, setF] = useState({ fullName: p.fullName, phone: p.phone ?? "", school: p.school ?? "", city: p.city ?? "", region: p.region ?? "", examYear: p.examYear ?? 2027, subjectIds: p.subjectIds }); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false);
  const save = async () => { setBusy(true); setErr({}); try { await api("/students/me", { method: "PATCH", body: { ...f, phone: f.phone || undefined, school: f.school || undefined, city: f.city || undefined, region: f.region || undefined } }); await refresh(); toast("Profile saved"); if (welcome) router.push("/dashboard"); } catch (e) { const fe = fieldErrors(e); setErr(Object.keys(fe).length ? fe : { form: e instanceof ApiError ? e.message : "Could not save" }); } finally { setBusy(false); } };
  return <><PageHeader title="Profile" sub="Only you can see this information." />{welcome && <Card className="mb-4 border-accent bg-accent/10"><p className="font-semibold">Welcome to Dibora! Review your details, then take your diagnostic assessment from the dashboard.</p></Card>}
    <Card><div className="mb-4 flex items-center gap-4"><div aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-bold text-accent">{p.fullName[0]}</div><div><p className="font-bold">{p.fullName}</p><p className="text-sm text-muted">{p.email}</p><div className="mt-1 flex gap-2"><Badge tone="success">Active</Badge><Badge tone="info">Grade {p.grade}{p.stream ? ` · ${p.stream}` : ""}</Badge></div></div></div>
      <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>{err.form && <p role="alert" className="sm:col-span-2 text-sm text-error">{err.form}</p>}
        <Field label="Full name" error={err.fullName}>{(id, a) => <input id={id} className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} {...a} />}</Field>
        <Field label="Phone" error={err.phone}>{(id, a) => <input id={id} className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} {...a} />}</Field>
        <Field label="School" error={err.school}>{(id, a) => <input id={id} className={inputCls} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} {...a} />}</Field>
        <Field label="City" error={err.city}>{(id, a) => <input id={id} className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} {...a} />}</Field>
        <Field label="Region">{(id) => <select id={id} className={inputCls} value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
        <Field label="Exam year" error={err.examYear}>{(id, a) => <input id={id} type="number" className={inputCls} value={f.examYear} onChange={(e) => setF({ ...f, examYear: Number(e.target.value) })} {...a} />}</Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{(subjects.data ?? []).map((s) => <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={f.subjectIds.includes(s.id)} onChange={(e) => setF({ ...f, subjectIds: e.target.checked ? [...f.subjectIds, s.id] : f.subjectIds.filter((x) => x !== s.id) })} />{s.names.en}</label>)}</div>{err.subjectIds && <p className="mt-1 text-xs text-error">{err.subjectIds}</p>}</fieldset>
        <Button type="submit" loading={busy} className="sm:col-span-2">Save changes</Button></form></Card>
    <Card className="mt-4"><h2 className="font-bold">Privacy</h2><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { const d = await api<unknown>("/students/me/export"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); a.download = "dibora-my-data.json"; a.click(); }}><Download size={16} />Export my data</Button><Button variant="danger" onClick={() => setDel(true)}><Trash2 size={16} />Delete account</Button></div></Card>
    <Modal open={del} title="Delete your account?" onClose={() => setDel(false)}><p className="text-sm">This removes your profile details and AI conversations and signs you out. This cannot be undone.</p><div className="mt-4 flex gap-2"><Button variant="danger" onClick={async () => { await api("/students/me", { method: "DELETE" }); await logout(); location.href = "/"; }}>Delete everything</Button><Button variant="secondary" onClick={() => setDel(false)}>Cancel</Button></div></Modal></>;
}
export function LiveProfile() { const { profile } = useSession(); return profile ? <Suspense><ProfileInner /></Suspense> : <Skeleton className="h-60" />; }

type Plan = { code: string; interval: string; names: Record<string, string>; priceMinor: number; currency: string; entitlements: Record<string, number | boolean> };
const feat = (e: Record<string, number | boolean>) => [e.questionsPerDay && (Number(e.questionsPerDay) > 1000 ? "Unlimited practice questions" : `${e.questionsPerDay} practice questions a day`), e.fullQuestionBank && "Full question bank", e.mockExams && "Full mock exams", e.advancedAnalytics && "Advanced analytics", e.personalizedRecommendations && "Personalized recommendations", e.aiMessagesPerDay && `${e.aiMessagesPerDay} AI messages a day`].filter(Boolean) as string[];
export function LivePricing() {
  const { role, profile } = useSession(); const router = useRouter(); const toast = useToast(); const q = useApi(() => api<Plan[]>("/subscriptions/plans")); const [busy, setBusy] = useState("");
  const buy = async (code: string) => { if (role !== "STUDENT") return router.push("/register"); setBusy(code); try { const r = await api<{ checkoutUrl: string }>("/subscriptions/checkout", { method: "POST", body: { planCode: code } }); window.location.href = r.checkoutUrl; } catch (e) { toast(e instanceof ApiError ? e.message : "Payment is unavailable right now", "error"); setBusy(""); } };
  return <div className="mx-auto max-w-6xl px-4 py-12"><h1 className="text-3xl font-bold">Pricing</h1><p className="mt-2 text-muted">Start free. Upgrade when you are ready for the full question bank and mock exams.</p>
    <div className="mt-8"><Async q={q} rows={2}>{(plans) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{plans.map((p) => <Card key={p.code}><h2 className="font-bold">{p.names.en}</h2><p className="mt-3 text-3xl font-extrabold text-primary">{p.priceMinor === 0 ? "Free" : `${p.currency} ${(p.priceMinor / 100).toLocaleString("en-US")}`}</p><ul className="mt-4 space-y-2 text-sm">{feat(p.entitlements).map((x) => <li key={x} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />{x}</li>)}</ul>
      <Button className="mt-5 w-full" variant={p.priceMinor ? "primary" : "secondary"} loading={busy === p.code} disabled={profile?.subscriptionStatus === "PREMIUM" && p.priceMinor > 0} onClick={() => p.priceMinor ? buy(p.code) : router.push(role === "STUDENT" ? "/dashboard" : "/register")}>{p.priceMinor ? (profile?.subscriptionStatus === "PREMIUM" ? "Current plan" : "Upgrade") : "Start free"}</Button></Card>)}</div>}</Async></div></div>;
}
function ReturnInner() {
  const ref = useSearchParams().get("ref"); const { refresh } = useSession(); const [st, setSt] = useState<"checking" | "SUCCESS" | "PENDING" | "FAILED" | "error">("checking");
  useEffect(() => { if (!ref) { setSt("error"); return; } let tries = 0; const run = async () => { try { const r = await api<{ status: string }>("/subscriptions/verify", { method: "POST", body: { reference: ref } }); if (r.status === "SUCCESS") { await refresh(); setSt("SUCCESS"); } else if (r.status === "PENDING" && ++tries < 6) setTimeout(run, 3000); else setSt(r.status === "PENDING" ? "PENDING" : "FAILED"); } catch { setSt("error"); } }; void run(); }, [ref, refresh]);
  return <div className="mx-auto max-w-md px-4 py-16"><Card className="text-center">{st === "checking" && <><Skeleton className="mx-auto h-8 w-40" /><p className="mt-3 text-sm text-muted">Confirming your payment with the provider…</p></>}
    {st === "SUCCESS" && <><h1 className="text-2xl font-bold text-success">Premium is active 🎉</h1><p className="mt-2 text-sm text-muted">Thank you. Your new features are ready.</p><Button href="/dashboard" className="mt-4">Go to dashboard</Button></>}
    {st === "PENDING" && <><h1 className="text-xl font-bold">Payment still processing</h1><p className="mt-2 text-sm text-muted">This can take a few minutes. Premium activates automatically once confirmed.</p><Button href="/dashboard" className="mt-4" variant="secondary">Back to dashboard</Button></>}
    {(st === "FAILED" || st === "error") && <><h1 className="text-xl font-bold text-error">We could not confirm the payment</h1><p className="mt-2 text-sm text-muted">If money left your account, contact us with this reference: {ref ?? "n/a"}.</p><Button href="/pricing" className="mt-4" variant="secondary">Back to plans</Button></>}</Card></div>;
}
export function LivePaymentReturn() { return <Suspense><ReturnInner /></Suspense>; }
