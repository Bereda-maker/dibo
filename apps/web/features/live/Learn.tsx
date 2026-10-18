"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flame, Bookmark, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, Progress, inputCls, cx, toneFor, useToast } from "../../components/ui";
import { ReadinessCard } from "../../components/ReadinessCard";
import { BarChart } from "../../components/Charts";
import { api, ApiError } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { useLocalizedName } from "../../lib/i18n";
import { Async, pct, diffTone, type ProgressData, type Rec } from "./shared";
import { NotesLibrary, type NotesEntry, type NotesSubject } from "../NotesLibrary";

type ExamRow = { id: string; type: string; title: string; locked: boolean; bestPercentage: number | null };
export function LiveDashboard() {
  const { profile } = useSession(); const q = useApi(async () => { const [p, r, e] = await Promise.all([api<ProgressData>("/progress"), api<Rec[]>("/recommendations"), api<ExamRow[]>("/exams")]); return { p, r, e }; });
  const hour = new Date().getHours(); const fields = profile ? [profile.fullName, profile.phone, profile.school, profile.region, profile.city, profile.stream, profile.examYear, profile.subjectIds.length].filter(Boolean).length : 0;
  return <Async q={q} rows={4}>{({ p, r, e }) => {
    const diag = e.find((x) => x.type === "DIAGNOSTIC"); const diagDone = diag?.bestPercentage != null; const rec = r[0];
    const subjects = Object.values(p.topics.reduce<Record<string, { name: string; a: number; c: number }>>((m, t) => { const x = (m[t.subjectName] ??= { name: t.subjectName, a: 0, c: 0 }); x.a += t.attempted; x.c += t.correct; return m; }, {}));
    const ranked = p.topics.filter((t) => t.attempted >= 3).map((t) => ({ ...t, a: pct(t.correct, t.attempted)! })).sort((a, b) => b.a - a.a);
    return <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, {profile?.fullName.split(" ")[0]} 👋</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge tone="info">{profile?.learningStatus.replaceAll("_", " ")}</Badge><Badge tone={profile?.subscriptionStatus === "PREMIUM" ? "accent" : "muted"}>{profile?.subscriptionStatus}</Badge><span className="flex items-center gap-1 font-semibold"><Flame size={14} className="text-accent" aria-hidden />{p.streak} day streak</span></div></div>
      {fields < 8 && <Card className="flex items-center justify-between gap-3 !p-4"><div className="flex-1"><p className="text-sm font-semibold">Profile {Math.round((fields / 8) * 100)}% complete</p><Progress value={(fields / 8) * 100} label="Profile completion" /></div><Button href="/profile" variant="secondary">Complete</Button></Card>}
      {!diagDone && diag ? <Card className="border-accent bg-accent/10"><h2 className="font-bold">Take your diagnostic assessment</h2><p className="mt-1 text-sm text-muted">Find your strong and weak topics and get your first study plan.</p><Button href={`/exams/${diag.id}`} className="mt-3">Start assessment</Button></Card> :
        <Card className="border-primary bg-primary/5"><p className="text-sm text-muted">Your next recommended activity</p>{rec ? <><p className="mt-1 text-lg font-bold">{rec.reason}</p><p className="mt-1 text-sm">{rec.action === "READ_NOTE" ? "Read the short note first." : `Practice ${rec.questionCount} ${rec.difficulty.toLowerCase()} questions.`} <Badge tone={rec.priority === "HIGH" ? "error" : rec.priority === "MEDIUM" ? "warning" : "muted"}>{rec.priority}</Badge></p>
          <Button className="mt-3" href={rec.action === "READ_NOTE" ? "/notes" : `/practice?topic=${rec.topicId}&difficulty=${rec.difficulty}`}>{rec.action === "READ_NOTE" ? "Open notes" : "Start Practice"}</Button></> : <p className="mt-1">Answer a few practice questions to unlock a personalised recommendation.</p>}</Card>}
      <div className="grid gap-4 md:grid-cols-2"><ReadinessCard overall={p.readiness.overall} parts={p.readiness.parts} />
        <Card><h2 className="font-bold">Subject performance</h2>{subjects.length ? <ul className="mt-3 space-y-3">{subjects.map((s) => { const v = pct(s.c, s.a); return <li key={s.name}><div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span className="font-semibold">{v}%</span></div><Progress value={v ?? 0} tone={toneFor(v)} label={s.name} /></li>; })}</ul> : <p className="mt-2 text-sm text-muted">No practice yet.</p>}</Card></div>
      <div className="grid gap-4 sm:grid-cols-2"><Card><h2 className="font-bold">Strong areas</h2><p className="mt-2 text-sm text-muted">{ranked.filter((t) => t.a >= 70).slice(0, 3).map((t) => `${t.topicName} ${t.a}%`).join(" · ") || "Practice more to find your strengths."}</p></Card><Card><h2 className="font-bold">Weak areas</h2><p className="mt-2 text-sm text-muted">{ranked.filter((t) => t.a < 60).slice(-3).map((t) => `${t.topicName} ${t.a}%`).join(" · ") || "No weak areas flagged yet."}</p></Card></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Questions done", p.questionsAttempted], ["Accuracy", p.accuracy == null ? "—" : `${p.accuracy}%`], ["Points", p.points], ["Best streak", `${p.longestStreak}d`]].map(([l, v]) => <Card key={String(l)} className="!p-4 text-center"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div></div>; }}</Async>;
}

export function LiveProgress() {
  const { profile } = useSession(); const q = useApi(() => api<ProgressData>("/progress")); const premium = profile?.subscriptionStatus === "PREMIUM";
  return <><PageHeader title="Progress" sub="How you are doing across practice and exams." /><Async q={q}>{(p) => {
    const subs = Object.values(p.topics.reduce<Record<string, { name: string; a: number; c: number }>>((m, t) => { const x = (m[t.subjectName] ??= { name: t.subjectName, a: 0, c: 0 }); x.a += t.attempted; x.c += t.correct; return m; }, {}));
    return <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Attempted", p.questionsAttempted], ["Correct", p.questionsCorrect], ["Incorrect", p.questionsAttempted - p.questionsCorrect], ["Accuracy", p.accuracy == null ? "—" : `${p.accuracy}%`], ["Streak", `${p.streak}d`], ["Best streak", `${p.longestStreak}d`], ["Points", p.points], ["Readiness", `${p.readiness.overall}%`]].map(([l, v]) => <Card key={String(l)} className="!p-4 text-center"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">Subject performance</h2><BarChart label="Subject performance" data={subs.map((s) => ({ label: s.name, value: pct(s.c, s.a) ?? 0 }))} /></Card>
        <Card><h2 className="mb-3 font-bold">Topic performance</h2>{premium ? <BarChart label="Topic performance" data={p.topics.map((t) => ({ label: t.topicName, value: pct(t.correct, t.attempted) ?? 0 }))} /> : <p className="text-sm text-muted">Detailed topic analytics are part of Premium. <Link href="/pricing" className="underline">See plans</Link></p>}</Card></div>
      <p className="mt-4 text-xs text-muted">{p.readiness.disclaimer}</p></>; }}</Async></>;
}

type Q = { id: string; text: string; type: string; difficulty: string; topicId: string; options: { id: string; text: string }[] };
type Fb = { correct: boolean; correctAnswer: string | null; explanation: string; topicId: string; recommendedNoteId: string | null; unlocked: string[] };
type Subj = { id: string; names: Record<string, string> }; type Top = { id: string; names: Record<string, string> };
function PracticeInner() {
  const sp = useSearchParams(); const toast = useToast(); const name = useLocalizedName();
  const [mode, setMode] = useState(sp.get("mode") ?? "random"); const [subject, setSubject] = useState(""); const [topic, setTopic] = useState(sp.get("topic") ?? ""); const [diff, setDiff] = useState(sp.get("difficulty") ?? "");
  const autoStart = sp.get("autoStart") === "1", autoStarted = useRef(false), grade = sp.get("grade"); const topicName = sp.get("topicName");
  const subjects = useApi(() => api<Subj[]>("/content/subjects")); const topics = useApi(() => (subject ? api<Top[]>(`/content/topics?subjectId=${subject}`) : Promise.resolve([] as Top[])), [subject]);
  const [list, setList] = useState<Q[] | null>(null); const [i, setI] = useState(0); const [sel, setSel] = useState<string>(""); const [fb, setFb] = useState<Fb | null>(null); const [score, setScore] = useState(0); const [busy, setBusy] = useState(false); const [limit, setLimit] = useState(false); const [err, setErr] = useState("");
  const start = async () => { setBusy(true); setErr(""); try { const qs = new URLSearchParams({ limit: "10" }); if (mode === "wrong") qs.set("mode", "wrong"); if (mode === "topic" && topic) qs.set("topicId", topic); if (diff) qs.set("difficulty", diff); setList(await api<Q[]>(`/practice/questions?${qs}`)); setI(0); setSel(""); setFb(null); setScore(0); } catch (e) { setErr(e instanceof ApiError ? e.message : "Could not load questions"); } finally { setBusy(false); } };
  useEffect(() => { if (autoStart && !autoStarted.current && mode === "topic" && topic) { autoStarted.current = true; void start(); } }, [autoStart, mode, topic]);
  const check = async (q: Q) => { setBusy(true); try { const body = q.type === "NUMERICAL" ? { questionId: q.id, numericAnswer: Number(sel) } : { questionId: q.id, selectedOptionId: sel }; const r = await api<Fb>("/practice/answer", { method: "POST", body }); setFb(r); if (r.correct) setScore((s) => s + 1); r.unlocked?.forEach((u) => toast(`Achievement unlocked: ${u}`)); } catch (e) { if (e instanceof ApiError && e.code === "DAILY_LIMIT") setLimit(true); else toast(e instanceof ApiError ? e.message : "Could not check answer", "error"); } finally { setBusy(false); } };
  if (limit) return <Card className="text-center"><h1 className="text-xl font-bold">Daily practice limit reached</h1><p className="mt-1 text-sm text-muted">Free accounts can answer 20 questions a day. Come back tomorrow or upgrade.</p><Button href="/pricing" className="mt-4">See Premium</Button></Card>;
  if (!list) return <><PageHeader title="Practice" sub={autoStart && topic ? `Grade ${grade ?? "—"} · ${topicName ?? "Selected unit"}` : undefined} /><Card className="space-y-4">{autoStart && topic && (busy || (!autoStarted.current && !err)) ? <p role="status" className="text-sm text-muted">Loading questions for {topicName ?? "this unit"}…</p> : <><div role="radiogroup" aria-label="Practice mode" className="flex flex-wrap gap-2">{[["random", "Random"], ["topic", "By topic"], ["wrong", "Previously incorrect"]].map(([k, l]) => <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k!)} className={cx("min-h-[44px] rounded-xl border px-4 text-sm font-medium", mode === k ? "border-primary bg-primary text-white" : "border-border")}>{l}</button>)}</div>
    {mode === "topic" && <div className="grid gap-3 sm:grid-cols-2"><select aria-label="Subject" className={inputCls} value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }}><option value="">Select subject</option>{(subjects.data ?? []).map((s) => <option key={s.id} value={s.id}>{name(s.names)}</option>)}</select><select aria-label="Topic" className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">Select topic</option>{(topics.data ?? []).map((t) => <option key={t.id} value={t.id}>{name(t.names)}</option>)}</select></div>}
    <select aria-label="Difficulty" className={inputCls + " max-w-[200px]"} value={diff} onChange={(e) => setDiff(e.target.value)}><option value="">Any difficulty</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
    {err && <p role="alert" className="text-sm text-error">{err}</p>}<Button onClick={start} loading={busy} disabled={mode === "topic" && !topic}>Start practice</Button></>}</Card></>;
  if (!list.length) return <EmptyState title="No questions match" body="Try other filters, or check back as new questions are added." action={<Button onClick={() => setList(null)}>Change filters</Button>} />;
  if (i >= list.length) return <Card className="text-center"><h1 className="text-2xl font-bold">Session complete</h1><p className="mt-2 text-4xl font-extrabold text-primary">{score}/{list.length}</p><div className="mt-4 flex justify-center gap-2"><Button onClick={() => setList(null)}>Practice again</Button><Button href="/dashboard" variant="secondary">Dashboard</Button></div></Card>;
  const q = list[i]!;
  return <div className="space-y-4"><Progress value={(i / list.length) * 100} label="Session progress" /><p className="text-sm text-muted">Question {i + 1} of {list.length}{autoStart && topicName ? ` · Grade ${grade ?? "—"} · ${topicName}` : ""} · <Badge tone={diffTone(q.difficulty)}>{q.difficulty}</Badge></p>
    <Card><h2 className="text-lg font-semibold">{q.text}</h2>{q.type === "NUMERICAL" ? <input aria-label="Your answer" inputMode="decimal" disabled={!!fb} className={inputCls + " mt-4 text-lg"} value={sel} onChange={(e) => setSel(e.target.value)} /> :
      <fieldset disabled={!!fb} className="mt-4 space-y-2"><legend className="sr-only">Choices</legend>{q.options.map((o) => <label key={o.id} className={cx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3", fb && fb.correctAnswer === o.text ? "border-success bg-success/10" : fb && sel === o.id ? "border-error bg-error/10" : sel === o.id ? "border-primary bg-primary/10" : "border-border")}><input type="radio" name="a" checked={sel === o.id} onChange={() => setSel(o.id)} />{o.text}</label>)}</fieldset>}</Card>
    {fb && <Card className={fb.correct ? "border-success" : "border-error"}><p role="status" className={cx("flex items-center gap-2 font-bold", fb.correct ? "text-success" : "text-error")}>{fb.correct ? <><CheckCircle2 /> Correct! Well done.</> : <><XCircle /> Not quite.</>}</p>{!fb.correct && <p className="mt-1 text-sm">Correct answer: <b>{fb.correctAnswer}</b></p>}<p className="mt-2 text-sm">{fb.explanation}</p>
      {!fb.correct && <div className="mt-3 flex flex-wrap gap-2">{fb.recommendedNoteId && <Button href={`/notes/${fb.recommendedNoteId}`} variant="secondary">Read note</Button>}<Button variant="secondary" onClick={() => { setTopic(fb.topicId); setMode("topic"); setList(null); }}>Practice similar</Button></div>}</Card>}
    <div className="flex gap-2">{!fb ? <Button onClick={() => check(q)} loading={busy} disabled={!sel}>Check answer</Button> : <Button onClick={() => { setI(i + 1); setSel(""); setFb(null); }}>{i + 1 === list.length ? "Finish" : "Next question"}</Button>}<Button variant="ghost" onClick={() => setList(null)}>End session</Button></div></div>;
}
export function LivePractice() { return <Suspense><PracticeInner /></Suspense>; }

export function LiveNotes() {
  const { profile } = useSession();
  const subjectQuery = useApi(() => api<NotesSubject[]>("/content/subjects?scope=notes"));
  const subjectRows = subjectQuery.data ?? [];
  const [selectedSubjectKey, setSelectedSubjectKey] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const grade = selectedGrade ?? (profile && profile.grade >= 9 && profile.grade <= 12 ? profile.grade : 12);
  const notesQuery = useApi(() => selectedSubjectKey ? api<NotesEntry[]>(`/content/notes?subjectKey=${encodeURIComponent(selectedSubjectKey)}&grade=${grade}&limit=50`) : Promise.resolve([] as NotesEntry[]), [selectedSubjectKey, grade]);
  const done = useApi(() => api<{ topicId: string }[]>("/notes/completed"));
  const bookmarks = useApi(() => api<{ type: string; id: string }[]>("/bookmarks"));
  return <NotesLibrary subjects={subjectRows} subjectSource={profile?.subjectIds.length ? "profile" : "all"}
    subjectLoading={subjectQuery.loading} subjectError={subjectQuery.error?.message}
    selectedSubjectKey={selectedSubjectKey} onSelectSubject={(subjectKey) => { setSelectedSubjectKey(subjectKey); setSelectedGrade(profile && profile.grade >= 9 && profile.grade <= 12 ? profile.grade : 12); }}
    grade={grade} onSelectGrade={setSelectedGrade} notes={notesQuery.loading ? [] : notesQuery.data ?? []} notesLoading={notesQuery.loading}
    notesError={notesQuery.error?.message} completedTopicIds={(done.data ?? []).map((item) => item.topicId)}
    bookmarkedNoteIds={(bookmarks.data ?? []).filter((item) => item.type === "NOTE").map((item) => item.id)}
    isPremium={profile?.subscriptionStatus === "PREMIUM"} />;
}
type NoteFull = { id: string; title: string; summary: string | null; topicId: string; topicName: Record<string, string>; grade: number; content: Record<string, unknown> };
type Tutorial = { id: string; youtubeVideoId: string; title: string; description: string | null; language: string; difficulty: string | null; thumbnailUrl: string | null; embedUrl: string };
function TutorialSection({ topicId }: { topicId: string }) {
  const tutorials = useApi<Tutorial[]>(() => api<Tutorial[]>(`/content/tutorials?topicId=${topicId}`), [topicId]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = tutorials.data?.find((video) => video.id === selected) ?? tutorials.data?.[0];
  return <Card className="mt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Video tutorials</h2><p className="mt-1 text-sm text-muted">Watch a tutorial selected for this exact topic.</p></div>{tutorials.loading && <span className="text-sm text-muted">Loading…</span>}</div>{tutorials.error ? tutorials.error instanceof ApiError && tutorials.error.code === "PREMIUM_REQUIRED" ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span>This tutorial is included with Premium.</span><Button href="/pricing" variant="secondary">See Premium</Button></div> : <p className="mt-3 text-sm text-muted">Tutorials are temporarily unavailable. The written lesson is still available.</p> : !tutorials.loading && !tutorials.data?.length ? <p className="mt-3 text-sm text-muted">Tutorials for this topic will be available soon.</p> : active ? <><div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">{selected ? <iframe className="h-full w-full" src={active.embedUrl} title={active.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <button type="button" className="group relative h-full w-full" onClick={() => setSelected(active.id)} aria-label={`Play ${active.title}`}><img src={active.thumbnailUrl ?? `https://i.ytimg.com/vi/${active.youtubeVideoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" /><span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-2xl text-white shadow-lg">▶</span></button>}</div><div className="mt-3 flex flex-wrap gap-2">{(tutorials.data ?? []).map((video) => <button key={video.id} type="button" onClick={() => setSelected(video.id)} className={cx("rounded-xl border px-3 py-2 text-left text-sm", active.id === video.id ? "border-primary bg-primary/5" : "border-border")}><span className="font-semibold">{video.title}</span><span className="ml-2 text-xs text-muted">{video.language === "am" ? "Amharic" : "English"}</span></button>)}</div>{active.description && <p className="mt-3 text-sm text-muted">{active.description}</p>}</> : null}</Card>;
}
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
export function LiveNote({ id }: { id: string }) {
  const q = useApi(() => api<NoteFull>(`/content/notes/${id}`), [id]); const bms = useApi(() => api<{ type: string; id: string }[]>("/bookmarks"), [id]); const toast = useToast(); const localizedName = useLocalizedName(); const [done, setDone] = useState(false);
  const Sec = ({ t, items, mono }: { t: string; items: string[]; mono?: boolean }) => items.length ? <Card className="mt-4"><h2 className="font-bold">{t}</h2><ul className={cx("mt-2 space-y-1 text-sm", mono ? "font-mono" : "list-disc pl-5")}>{items.map((i) => <li key={i} className={mono ? "rounded-lg bg-border/40 px-3 py-2" : ""}>{i}</li>)}</ul></Card> : null;
  return <Async q={q}>{(n) => { const c = n.content; const marked = bms.data?.some((b) => b.type === "NOTE" && b.id === n.id);
    return <><PageHeader title={n.title} sub={n.summary ?? undefined} action={<Button variant="secondary" aria-pressed={!!marked} onClick={async () => { await api("/bookmarks", { method: marked ? "DELETE" : "POST", body: { type: "NOTE", id: n.id } }); bms.reload(); }}><Bookmark size={16} className={marked ? "fill-accent" : ""} />{marked ? "Saved" : "Bookmark"}</Button>} />
      {typeof c.explanation === "string" && <Card className="mt-4"><h2 className="font-bold">Explanation</h2><p className="mt-2 text-sm leading-relaxed">{c.explanation}</p></Card>}
      <Sec t="Definitions" items={list(c.definitions)} /><Sec t="Important concepts" items={list(c.concepts)} /><Sec t="Formulas" items={list(c.formulas)} mono /><Sec t="Examples" items={list(c.examples)} /><Sec t="Key points" items={list(c.keyPoints)} /><Sec t="Common mistakes" items={list(c.commonMistakes)} /><Sec t="Exam tips" items={list(c.examTips)} />
      <TutorialSection topicId={n.topicId} />
      <div className="mt-6 flex flex-wrap gap-2"><Button disabled={done} onClick={async () => { try { await api(`/notes/${n.id}/complete`, { method: "POST", body: {} }); setDone(true); toast("Marked as completed"); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "error"); } }}><CheckCircle2 size={16} />{done ? "Completed" : "Mark completed"}</Button>
        <Button variant="secondary" onClick={async () => { await api("/bookmarks", { method: "POST", body: { type: "TOPIC", id: n.topicId } }); toast("Added to review later", "info"); }}><Clock size={16} />Review later</Button><Button href={`/practice?mode=topic&topic=${n.topicId}&grade=${n.grade}&topicName=${encodeURIComponent(localizedName(n.topicName) || n.title)}&autoStart=1`} variant="secondary">Practice this topic</Button><Button href={`/assistant?topicId=${n.topicId}&topicName=${encodeURIComponent(localizedName(n.topicName) || n.title)}&grade=${n.grade}`} variant="ghost">Ask the AI</Button></div></>; }}</Async>;
}
