"use client";
import { DEMO } from "../../../lib/config";
import { LiveRegister } from "../../../features/live/AuthForms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { registerSchema } from "@dibora/validation";
import { Button, Card, Field, inputCls } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { SUBJECTS } from "../../../lib/mock";

const REGIONS = ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray", "Central Ethiopia"];
const STREAMS = ["Natural Science", "Social Science"];
// The shared server schema requires UUID subject ids; the demo catalogue uses short ids, so relax only that field here.
const formSchema = registerSchema.innerType().extend({ subjectIds: z.array(z.string()).min(1, "Select at least one subject") }).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

function DemoRegister() {
  const { update } = useStore(); const router = useRouter(); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [consent, setConsent] = useState(false);
  return <div className="mx-auto max-w-2xl px-4 py-10"><Card><h1 className="text-2xl font-bold">Create your account</h1><p className="mt-1 text-sm text-muted">We collect only what we need. Your details are never shown publicly.</p>
    <form noValidate className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget);
      const r = formSchema.safeParse({ fullName: f.get("fullname"), email: f.get("email"), phone: f.get("phone"), password: f.get("password"), confirmPassword: f.get("confirm"), educationLevel: "SECONDARY", grade: Number(f.get("grade")), school: f.get("school"), region: f.get("region"), city: f.get("city"), stream: f.get("stream"), examYear: Number(f.get("year")), subjectIds: f.getAll("subjects") });
      if (!r.success) { const m: Record<string, string> = {}; for (const i of r.error.issues) m[String(i.path[0])] = i.message; setErr(m); document.getElementById("form-errors")?.focus(); return; }
      if (!consent) { setErr({ consent: "Please accept the privacy terms to continue" }); return; }
      setErr({}); setBusy(true); const v = r.data;
      setTimeout(() => { update((s) => ({ ...s, user: { name: v.fullName, email: v.email, phone: v.phone, school: v.school, region: v.region, city: v.city, grade: v.grade, stream: v.stream, examYear: v.examYear, subjects: v.subjectIds, role: "STUDENT", plan: "FREE", leaderboardOptIn: false, learningStatus: "PROFILE_INCOMPLETE" } })); router.push("/profile?welcome=1"); }, 500); }}>
      {Object.keys(err).length > 0 && <p id="form-errors" tabIndex={-1} role="alert" className="sm:col-span-2 rounded-xl bg-error/10 p-3 text-sm text-error">Please fix the highlighted fields.</p>}
      <Field label="Full name" error={err.fullName}>{(id, a) => <input id={id} name="fullname" autoComplete="name" className={inputCls} {...a} />}</Field>
      <Field label="Email" error={err.email}>{(id, a) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...a} />}</Field>
      <Field label="Phone number" error={err.phone} hint="e.g. 0911 223 344">{(id, a) => <input id={id} name="phone" type="tel" autoComplete="tel" className={inputCls} {...a} />}</Field>
      <Field label="School" error={err.school}>{(id, a) => <input id={id} name="school" className={inputCls} {...a} />}</Field>
      <Field label="Region" error={err.region}>{(id, a) => <select id={id} name="region" className={inputCls} defaultValue="" {...a}><option value="" disabled>Select region</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
      <Field label="City" error={err.city}>{(id, a) => <input id={id} name="city" className={inputCls} {...a} />}</Field>
      <Field label="Grade" error={err.grade}>{(id, a) => <select id={id} name="grade" className={inputCls} defaultValue="12" {...a}><option value="12">Grade 12</option></select>}</Field>
      <Field label="Educational stream" error={err.stream}>{(id, a) => <select id={id} name="stream" className={inputCls} defaultValue="" {...a}><option value="" disabled>Select stream</option>{STREAMS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
      <Field label="Exam year" error={err.examYear}>{(id, a) => <input id={id} name="year" type="number" defaultValue={2027} className={inputCls} {...a} />}</Field>
      <div className="hidden sm:block" />
      <Field label="Password" error={err.password} hint="At least 10 characters with a letter and a number">{(id, a) => <input id={id} name="password" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <Field label="Confirm password" error={err.confirmPassword}>{(id, a) => <input id={id} name="confirm" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{SUBJECTS.map((s) => <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" name="subjects" value={s.id} defaultChecked />{s.name}</label>)}</div>{err.subjectIds && <p className="mt-1 text-xs text-error">{err.subjectIds}</p>}</fieldset>
      <div className="sm:col-span-2"><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I agree to the <Link href="/privacy" className="underline">privacy terms</Link>. If I am under 18, a parent or guardian is aware I am using Dibora.</label>{err.consent && <p className="mt-1 text-xs text-error">{err.consent}</p>}</div>
      <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button></form>
    <p className="mt-4 text-sm">Already registered? <Link href="/login" className="text-primary underline">Log in</Link></p></Card></div>; }

export default function Page() { return DEMO ? <DemoRegister /> : <LiveRegister />; }
