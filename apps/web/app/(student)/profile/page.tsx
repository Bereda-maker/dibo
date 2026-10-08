"use client";
import { DEMO } from "../../../lib/config";
import { LiveProfile } from "../../../features/live/Social";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Modal, PageHeader, inputCls, useToast } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { SUBJECTS } from "../../../lib/mock";
import { useRouter } from "next/navigation";

function Inner() {
  const { state, update } = useStore(); const u = state.user!; const toast = useToast(); const welcome = useSearchParams().get("welcome"); const router = useRouter();
  const [f, setF] = useState({ name: u.name, phone: u.phone, school: u.school, city: u.city, examYear: u.examYear, subjects: u.subjects }); const [del, setDel] = useState(false); const [err, setErr] = useState<Record<string, string>>({});
  const save = () => { const e: Record<string, string> = {}; if (f.name.trim().length < 2) e.name = "Enter your full name"; if (!/^(?:\+251|0)?[79]\d{8}$/.test(f.phone.replace(/\s/g, ""))) e.phone = "Enter a valid Ethiopian phone number"; if (f.school.trim().length < 2) e.school = "Enter your school"; if (!f.subjects.length) e.subjects = "Select at least one subject"; setErr(e); if (Object.keys(e).length) return;
    update((s) => ({ ...s, user: s.user && { ...s.user, ...f, learningStatus: s.user.learningStatus === "PROFILE_INCOMPLETE" ? "DIAGNOSTIC_PENDING" : s.user.learningStatus } })); toast("Profile saved"); if (welcome) router.push("/diagnostic"); };
  return (<><PageHeader title="Profile" sub="Only you can see this information." />
    {welcome && <Card className="mb-4 border-accent bg-accent/10"><p className="font-semibold">Welcome to Dibora! Review your details, then take your diagnostic assessment.</p></Card>}
    <Card><div className="mb-4 flex items-center gap-4"><div aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-bold text-accent">{u.name[0]}</div><div><p className="font-bold">{u.name}</p><p className="text-sm text-muted">{u.email}</p><div className="mt-1 flex gap-2"><Badge tone="success">Active</Badge><Badge tone="info">Grade {u.grade} · {u.stream}</Badge></div></div></div>
      <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Full name" error={err.name}>{(id, a) => <input id={id} className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} {...a} />}</Field>
        <Field label="Phone" error={err.phone}>{(id, a) => <input id={id} className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} {...a} />}</Field>
        <Field label="School" error={err.school}>{(id, a) => <input id={id} className={inputCls} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} {...a} />}</Field>
        <Field label="City">{(id, a) => <input id={id} className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} {...a} />}</Field>
        <Field label="Exam year">{(id, a) => <input id={id} type="number" className={inputCls} value={f.examYear} onChange={(e) => setF({ ...f, examYear: Number(e.target.value) })} {...a} />}</Field>
        <Field label="Region (read only)">{(id) => <input id={id} className={inputCls} value={u.region} readOnly />}</Field>
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{SUBJECTS.map((s) => <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={f.subjects.includes(s.id)} onChange={(e) => setF({ ...f, subjects: e.target.checked ? [...f.subjects, s.id] : f.subjects.filter((x) => x !== s.id) })} />{s.name}</label>)}</div>{err.subjects && <p className="mt-1 text-xs text-error">{err.subjects}</p>}</fieldset>
        <Button type="submit" className="sm:col-span-2">Save changes</Button></form></Card>
    <Card className="mt-4"><h2 className="font-bold">Privacy</h2><label className="mt-2 flex items-center gap-3 text-sm"><input type="checkbox" checked={u.leaderboardOptIn} onChange={(e) => update((s) => ({ ...s, user: s.user && { ...s.user, leaderboardOptIn: e.target.checked } }))} />Show me on the leaderboard (display name and points only)</label>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dibora-my-data.json"; a.click(); }}><Download size={16} />Export my data</Button><Button variant="danger" onClick={() => setDel(true)}><Trash2 size={16} />Delete account</Button></div></Card>
    <Modal open={del} title="Delete your account?" onClose={() => setDel(false)}><p className="text-sm">This permanently removes your profile, progress and conversations from this device. This cannot be undone.</p><div className="mt-4 flex gap-2"><Button variant="danger" onClick={() => { localStorage.removeItem("dibora_state_v1"); location.href = "/"; }}>Delete everything</Button><Button variant="secondary" onClick={() => setDel(false)}>Cancel</Button></div></Modal></>); }
function DemoP() { return <Suspense><Inner /></Suspense>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveProfile />; }
