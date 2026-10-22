"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, Bell, Check, Copy, Download, Lock, Search as SearchIcon, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, cx, inputCls, useToast } from "../../components/ui";
import { api, publicApi, ApiError, fieldErrors } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { REGIONS } from "../../lib/config";
import { useLocalizedName } from "../../lib/i18n";
import { Async, diffTone } from "./shared";
import { MarketingPageHeader } from "../../components/MarketingPageHeader";
import { notifyStudentUnreadNotificationsChanged, useStudentNotificationCountContext } from "../../lib/useStudentNotificationCount";

export { LiveAssistant } from "../assistant/LiveAssistant";

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

type Notif = { id: string; title: string; body: string | null; readAt: string | null };
function LiveNotificationItem({ notification, onAutoRead }: { notification: Notif; onAutoRead: (id: string) => Promise<void> }) {
  const visibleNode = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notification.readAt || !visibleNode.current) return;
    let timer: number | null = null;
    let attemptedWhileVisible = false;
    const markAfterReadingTime = () => {
      timer = null;
      attemptedWhileVisible = true;
      void onAutoRead(notification.id);
    };
    const ObserverCtor = (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    if (!ObserverCtor) {
      timer = window.setTimeout(markAfterReadingTime, 1_200);
      return () => { if (timer !== null) window.clearTimeout(timer); };
    }
    const observer = new ObserverCtor((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25);
      if (visible && timer === null && !attemptedWhileVisible) timer = window.setTimeout(markAfterReadingTime, 1_000);
      if (!visible) {
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        attemptedWhileVisible = false;
      }
    }, { threshold: [0, 0.25] });
    observer.observe(visibleNode.current);
    return () => { if (timer !== null) window.clearTimeout(timer); observer.disconnect(); };
  }, [notification.id, notification.readAt, onAutoRead]);

  return <Card className={cx("transition-opacity", notification.readAt && "opacity-60")}><div ref={visibleNode} className="flex gap-3"><Bell size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{notification.title}</p>{!notification.readAt && <Badge tone="info">New</Badge>}</div><p className="text-sm text-muted">{notification.body}</p></div></div></Card>;
}
export function LiveNotifications() {
  const q = useApi(() => api<Notif[]>("/notifications"));
  const notificationCount = useStudentNotificationCountContext(); const toast = useToast(); const [marking, setMarking] = useState(false); const readInFlight = useRef(new Set<string>());
  const unread = notificationCount.count ?? 0;
  const markOneRead = useCallback(async (id: string) => {
    if (readInFlight.current.has(id)) return;
    readInFlight.current.add(id);
    try {
      await api(`/notifications/${id}/read`, { method: "POST", body: {} });
      q.setData((current) => current?.map((notification) => notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification) ?? current);
      notifyStudentUnreadNotificationsChanged();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Could not mark this notification as read. Scroll back to it to retry.", "error");
    } finally { readInFlight.current.delete(id); }
  }, [q.setData, toast]);
  const markAllRead = async () => {
    setMarking(true);
    try {
      await api("/notifications/read-all", { method: "POST", body: {} });
      notifyStudentUnreadNotificationsChanged(); q.reload(); toast("Notifications marked as read", "success");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Could not mark notifications as read.", "error");
    } finally { setMarking(false); }
  };
  return <><PageHeader title="Notifications" sub="New messages are marked as read after you view them." action={<div className="flex flex-wrap items-center gap-2">{unread > 0 && <Badge tone="info"><span aria-hidden="true">{unread.toLocaleString()}</span><span className="sr-only">{unread} unread notifications</span></Badge>}<Button variant="secondary" loading={marking} disabled={notificationCount.count === 0} onClick={() => void markAllRead()}>Mark all read</Button></div>} /><Async q={q}>{(rows) => rows.length ? <div className="space-y-2">{rows.map((notification) => <LiveNotificationItem key={notification.id} notification={notification} onAutoRead={markOneRead} />)}</div> : <EmptyState title="You're all caught up" />}</Async></>;
}
type Ach = { code: string; names: Record<string, string>; points: number; unlockedAt: string | null };
export function LiveAchievements() {
  const q = useApi(() => api<Ach[]>("/achievements")); const name = useLocalizedName();
  return <Async q={q}>{(rows) => <><PageHeader title="Achievements" sub={`${rows.filter((r) => r.unlockedAt).length} of ${rows.length} unlocked`} /><div className="grid gap-3 sm:grid-cols-2">{rows.map((a) => <Card key={a.code} className={cx("flex items-center gap-4 !p-4", !a.unlockedAt && "opacity-60")}>{a.unlockedAt ? <Award className="text-accent" size={28} aria-hidden /> : <Lock size={28} className="text-muted" aria-hidden />}<div><p className="font-bold">{name(a.names)}</p><p className="text-sm text-muted">{a.points} points</p><p className="sr-only">{a.unlockedAt ? "Unlocked" : "Locked"}</p></div></Card>)}</div></>}</Async>;
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
    {dq.length < 2 ? <p className="mt-6 text-sm text-muted">Type at least 2 letters to search.</p> : r.error ? <p role="alert" className="mt-6 text-sm text-error">{r.error.message || "Search failed."} <button className="underline" onClick={r.reload}>Retry</button></p> : r.loading ? <Skeleton className="mt-4 h-24" /> : hits.length ? <ul className="mt-4 space-y-2">{hits.map((h) => <li key={h.kind + h.id}><Link href={href(h)} className="block rounded-card border border-border bg-surface p-4 hover:border-primary"><Badge tone="info">{h.kind}</Badge><p className="mt-1 font-semibold">{h.title}</p>{h.sub && <p className="text-sm text-muted">{h.sub}</p>}</Link></li>)}</ul> : <div className="mt-6"><EmptyState title={`No results for “${dq}”`} body="Check the spelling or try a broader word." /></div>}</>;
}

type Subj = { id: string; names: Record<string, string> };
function ProfileInner() {
  const { profile, refresh, logout } = useSession(); const toast = useToast(); const router = useRouter(); const welcome = useSearchParams().get("welcome"); const subjects = useApi(() => publicApi<Subj[]>("/subjects")); const name = useLocalizedName();
  const p = profile!; const plannerSaveFailed = useSearchParams().get("plannerSaveFailed") === "1"; const now = new Date(); const currentEcYear = now.getFullYear() - (now >= new Date(now.getFullYear(), 8, 11) ? 7 : 8); const [f, setF] = useState({ fullName: p.fullName, phone: p.phone ?? "", school: p.school ?? "", city: p.city ?? "", region: p.region ?? "", examYear: p.examYear ?? currentEcYear, dailyStudyHours: p.dailyStudyHours ?? 2, subjectIds: p.subjectIds }); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false);
  useEffect(() => { if (!plannerSaveFailed) return; const raw = sessionStorage.getItem("deborah_goal_planner_draft"); if (!raw) return; try { const draft = JSON.parse(raw) as { stream?: unknown; city?: unknown; region?: unknown; examYear?: unknown; dailyStudyHours?: unknown }; if (typeof draft.stream !== "string" || typeof draft.city !== "string" || typeof draft.region !== "string" || typeof draft.examYear !== "number" || typeof draft.dailyStudyHours !== "number") return; void api("/students/me", { method: "PATCH", body: { stream: draft.stream, city: draft.city, region: draft.region, examYear: draft.examYear, dailyStudyHours: draft.dailyStudyHours } }).then(async () => { sessionStorage.removeItem("deborah_goal_planner_draft"); await refresh(); router.push("/dashboard"); }).catch(() => {}); } catch { /* Leave the draft untouched so the student can retry. */ } }, [plannerSaveFailed, refresh, router]);
  const save = async () => { setBusy(true); setErr({}); try { await api("/students/me", { method: "PATCH", body: { ...f, phone: f.phone || undefined, school: f.school || undefined, city: f.city || undefined, region: f.region || undefined } }); await refresh(); toast("Profile saved"); if (welcome) router.push("/dashboard"); } catch (e) { const fe = fieldErrors(e); setErr(Object.keys(fe).length ? fe : { form: e instanceof ApiError ? e.message : "Could not save" }); } finally { setBusy(false); } };
  return <><PageHeader title="Profile" sub="Only you can see this information." />{welcome && <Card className="mb-4 border-accent bg-accent/10"><p className="font-semibold">Welcome to Deborah! Review your details, then take your diagnostic assessment from the dashboard.</p></Card>}
    <Card><div className="mb-4 flex items-center gap-4"><div aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-bold text-accent">{p.fullName[0]}</div><div><p className="font-bold">{p.fullName}</p><p className="text-sm text-muted">{p.email}</p><div className="mt-1 flex gap-2"><Badge tone="success">Active</Badge><Badge tone="info">Grade {p.grade}{p.stream ? ` · ${p.stream}` : ""}</Badge></div></div></div>
      <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>{err.form && <p role="alert" className="sm:col-span-2 text-sm text-error">{err.form}</p>}
        <Field label="Full name" error={err.fullName}>{(id, a) => <input id={id} className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} {...a} />}</Field>
        <Field label="Phone" error={err.phone}>{(id, a) => <input id={id} className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} {...a} />}</Field>
        <Field label="School" error={err.school}>{(id, a) => <input id={id} className={inputCls} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} {...a} />}</Field>
        <Field label="City" error={err.city}>{(id, a) => <input id={id} className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} {...a} />}</Field>
        <Field label="Region">{(id) => <select id={id} className={inputCls} value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
        <Field label="Exam year (E.C.)" error={err.examYear}>{(id, a) => <input id={id} type="number" className={inputCls} value={f.examYear} onChange={(e) => setF({ ...f, examYear: Number(e.target.value) })} {...a} />}</Field>
        <Field label="Daily study time">{(id) => <select id={id} className={inputCls} value={f.dailyStudyHours} onChange={(e) => setF({ ...f, dailyStudyHours: Number(e.target.value) })}>{[[1, "Up to 1 hour"], [2, "2 hours"], [4, "3–4 hours"], [6, "5–6 hours"], [8, "7+ hours"]].map(([hours, label]) => <option key={hours} value={hours}>{label}</option>)}</select>}</Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{(subjects.data ?? []).map((s) => <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={f.subjectIds.includes(s.id)} onChange={(e) => setF({ ...f, subjectIds: e.target.checked ? [...f.subjectIds, s.id] : f.subjectIds.filter((x) => x !== s.id) })} />{name(s.names)}</label>)}</div>{err.subjectIds && <p className="mt-1 text-xs text-error">{err.subjectIds}</p>}</fieldset>
        <Button type="submit" loading={busy} className="sm:col-span-2">Save changes</Button></form></Card>
    <Card className="mt-4"><h2 className="font-bold">Privacy</h2><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { const d = await api<unknown>("/students/me/export"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); a.download = "dibora-my-data.json"; a.click(); }}><Download size={16} />Export my data</Button><Button variant="danger" onClick={() => setDel(true)}><Trash2 size={16} />Delete account</Button></div></Card>
    <Modal open={del} title="Delete your account?" onClose={() => setDel(false)}><p className="text-sm">This removes your profile details and AI conversations and signs you out. This cannot be undone.</p><div className="mt-4 flex gap-2"><Button variant="danger" onClick={async () => { await api("/students/me", { method: "DELETE" }); await logout(); location.href = "/"; }}>Delete everything</Button><Button variant="secondary" onClick={() => setDel(false)}>Cancel</Button></div></Modal></>;
}
export function LiveProfile() { const { profile } = useSession(); return profile ? <Suspense><ProfileInner /></Suspense> : <Skeleton className="h-60" />; }

type Plan = { code: string; interval: string; names: Record<string, string>; priceMinor: number; currency: string; entitlements: Record<string, number | boolean> };
const feat = (e: Record<string, number | boolean>) => [e.questionsPerDay && (Number(e.questionsPerDay) > 1000 ? "Unlimited practice questions" : `${e.questionsPerDay} practice questions a day`), e.fullQuestionBank && "Full question bank", e.mockExams && "Full mock exams", e.advancedAnalytics && "Advanced analytics", e.personalizedRecommendations && "Personalized recommendations", e.aiMessagesPerDay && `${e.aiMessagesPerDay} AI messages a day`].filter(Boolean) as string[];
export function LivePricing() {
  const { role, profile } = useSession(); const router = useRouter(); const toast = useToast(); const q = useApi(() => api<Plan[]>("/subscriptions/plans")); const name = useLocalizedName(); const [busy, setBusy] = useState("");
  const buy = async (code: string) => { if (role !== "STUDENT") return router.push("/login"); setBusy(code); try { const r = await api<{ reference: string }>("/subscriptions/checkout", { method: "POST", body: { planCode: code } }); router.push(`/payment/return?ref=${encodeURIComponent(r.reference)}`); } catch (e) { toast(e instanceof ApiError ? e.message : "Payment is unavailable right now", "error"); setBusy(""); } };
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="Plans that grow with you" title="Start free. Upgrade when you are ready." description="Build a steady study routine with the Free plan, then explore more practice and exam tools whenever you need them. Available plan details appear below." />
      <div className="mt-8">
        <Async q={q} rows={2}>
          {(plans) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Card key={p.code}>
                  <h2 className="font-bold">{name(p.names)}</h2>
                  <p className="mt-3 text-3xl font-extrabold text-primary">{p.priceMinor === 0 ? "Free" : `${p.currency} ${(p.priceMinor / 100).toLocaleString("en-US")}`}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {feat(p.entitlements).map((x) => <li key={x} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />{x}</li>)}
                  </ul>
                  <Button className="mt-5 w-full" variant={p.priceMinor ? "primary" : "secondary"} loading={busy === p.code} disabled={profile?.subscriptionStatus === "PREMIUM" && p.priceMinor > 0} onClick={() => p.priceMinor ? buy(p.code) : router.push(role === "STUDENT" ? "/dashboard" : "/login")}>{p.priceMinor ? (profile?.subscriptionStatus === "PREMIUM" ? "Current plan" : "Upgrade") : "Start free"}</Button>
                </Card>
              ))}
            </div>
          )}
        </Async>
      </div>
    </div>
  );
}
type PayStatus = { reference: string; status: string; amountMinor: number; currency: string; paymentMethod: string | null; manualReviewStatus: string | null };
type PayInfo = { methods: string[]; accounts: { method: string; accountName: string; accountNumber: string }[] };
const METHOD_LABEL: Record<string, string> = { cbe: "CBE", boa: "Bank of Abyssinia", telebirr: "Telebirr", mpesa: "M-Pesa", cbebirr: "CBE Birr", dashen: "Dashen Bank", awash: "Awash Bank", siinqee: "Siinqee Bank", kaafiebirr: "Kaafi Birr", coopayebirr: "Coop Pay Birr" };
/** Manual payment + receipt verification. The browser only talks to the Deborah API; the webhook (not this page) is the source of truth. */
function ReturnInner() {
  const ref = useSearchParams().get("ref"); const { refresh } = useSession(); const toast = useToast();
  const [p, setP] = useState<PayStatus | null>(null); const [info, setInfo] = useState<PayInfo | null>(null); const [err, setErr] = useState(false);
  const [method, setMethod] = useState("telebirr"); const [txRef, setTxRef] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [fileErr, setFileErr] = useState("");
  const load = async () => { if (!ref) return setErr(true); try { const r = await api<PayStatus>(`/subscriptions/payments/${encodeURIComponent(ref)}`); setP((old) => { if (old?.status !== "VERIFIED" && r.status === "VERIFIED") void refresh(); return r; }); } catch { setErr(true); } };
  useEffect(() => { void load(); void api<PayInfo>("/subscriptions/payment-info").then(setInfo).catch(() => {}); }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (p?.status !== "VERIFYING") return; const t = setInterval(() => void load(), 5000); return () => clearInterval(t); }, [p?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (f: File | null) => { setFileErr(""); if (f && !["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setFileErr("Use a JPEG, PNG or WebP image."); return setFile(null); } if (f && f.size > 8 * 1024 * 1024) { setFileErr("The image must be 8 MB or smaller."); return setFile(null); } setFile(f); }; // convenience only; the server re-validates
  const submit = async () => { if (!ref || !file) return setFileErr("Please choose your receipt screenshot."); setBusy(true); const fd = new FormData(); fd.set("method", method); if (txRef.trim()) fd.set("transactionReference", txRef.trim()); fd.set("image", file);
    try { await api(`/subscriptions/payments/${encodeURIComponent(ref)}/submit`, { method: "POST", body: fd }); await load(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not submit. Please try again.", "error"); } finally { setBusy(false); } };
  if (err) return <div className="mx-auto max-w-md px-4 py-16"><Card className="text-center"><h1 className="text-xl font-bold text-error">We could not find this payment</h1><Button href="/pricing" className="mt-4" variant="secondary">Back to plans</Button></Card></div>;
  if (!p) return <div className="mx-auto max-w-md px-4 py-16"><Skeleton className="h-40" /></div>;
  const acct = info?.accounts.find((a) => a.method === method); const amount = `${p.currency} ${(p.amountMinor / 100).toLocaleString("en-US")}`;
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast("Copied to clipboard", "info"); } catch { toast("Copy is unavailable in this browser", "error"); } };
  return <div className="mx-auto max-w-lg px-4 py-12"><Card>
    {p.status === "VERIFIED" || p.status === "SUCCESS" ? <div className="text-center"><h1 className="text-2xl font-bold text-success">Payment verified</h1><p className="mt-2 text-sm text-muted">Premium is active. Your new features are ready.</p><Button href="/dashboard" className="mt-4">Go to dashboard</Button></div>
    : p.manualReviewStatus === "PENDING" ? <div className="text-center"><h1 className="text-2xl font-bold">Receipt sent for review</h1><p className="mt-2 text-sm text-muted">Verify.et could not process the image, so your receipt was securely sent to the Deborah admin team. They will review it within 24 hours.</p><p className="mt-3 rounded-xl bg-warning/10 p-3 text-sm">Your Premium access will activate only after an admin confirms the payment.</p><Button href="/dashboard" className="mt-4" variant="secondary">Back to dashboard</Button></div>
    : p.status === "VERIFYING" ? <div className="text-center"><h1 className="text-xl font-bold">Verification in progress</h1><p className="mt-2 text-sm text-muted">Verification in progress. You can leave this page; we'll update your payment when verification completes.</p><Button href="/dashboard" className="mt-4" variant="secondary">Back to dashboard</Button></div>
    : <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Pay and submit your receipt</h1><p className="mt-1 text-sm text-muted">Amount to pay: <b>{amount}</b></p></div>
      {p.status === "FAILED" && <p className="rounded-xl bg-error/10 p-3 text-sm text-error">Payment could not be verified. Check the details and submit a clear receipt screenshot again.</p>}
      <ol className="list-decimal space-y-1 pl-5 text-sm"><li>Send exactly <b>{amount}</b> using the payment method you choose below.</li><li>Take a screenshot of the receipt.</li><li>Submit it here. Access is granted only after the payment is verified.</li></ol>
      <Field label="Payment method">{(id, a) => <select id={id} className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)} {...a}>{(info?.methods ?? ["telebirr"]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>)}</select>}</Field>
      {acct && <div className="rounded-xl bg-surface p-3 text-sm"><p>Pay to <b>{acct.accountName}</b></p><div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"><span className="min-w-0 break-all font-semibold">{acct.accountNumber}</span><button type="button" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2 font-medium text-primary hover:bg-primary/10" onClick={() => void copy(acct.accountNumber)} aria-label="Copy account or phone number" title="Copy account or phone number"><Copy size={16} aria-hidden />Copy</button></div><p className="mt-1 text-xs text-muted">Account number / phone number</p></div>}
      <Field label="Transaction number (if shown on your receipt)">{(id, a) => <input id={id} className={inputCls} value={txRef} maxLength={64} onChange={(e) => setTxRef(e.target.value)} {...a} />}</Field>
      <Field label="Receipt screenshot (JPEG, PNG or WebP, up to 8 MB)" error={fileErr}>{(id, a) => <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className={inputCls} onChange={(e) => pick(e.target.files?.[0] ?? null)} {...a} />}</Field>
      <Button className="w-full" loading={busy} onClick={submit}>Submit for verification</Button>
    </div>}
  </Card></div>;
}
export function LivePaymentReturn() { return <Suspense><ReturnInner /></Suspense>; }
