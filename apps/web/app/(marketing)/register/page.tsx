"use client";

import { AuthLayout } from "../../../components/AuthLayout";
import { AuthRedirectProgress } from "../../../components/AuthRedirectProgress";
import { DEMO } from "../../../lib/config";
import { DemoAuthMethodChoice, LiveRegister } from "../../../features/live/AuthForms";
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
const formSchema = registerSchema.innerType().extend({ subjectIds: z.array(z.string()).min(1, "Select at least one subject") }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

function DemoRegister() {
  const { update } = useStore();
  const router = useRouter();
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <AuthRedirectProgress message={progress} />
      <Card>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">We collect only what we need. Your details are never shown publicly.</p>
        <form noValidate className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = formSchema.safeParse({ fullName: form.get("fullname"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), confirmPassword: form.get("confirm"), educationLevel: "SECONDARY", grade: Number(form.get("grade")), school: form.get("school"), region: form.get("region"), city: form.get("city"), stream: form.get("stream"), examYear: Number(form.get("year")), subjectIds: form.getAll("subjects") });
          if (!result.success) {
            const fields: Record<string, string> = {};
            for (const issue of result.error.issues) fields[String(issue.path[0])] = issue.message;
            setError(fields);
            document.getElementById("form-errors")?.focus();
            return;
          }
          if (!consent) { setError({ consent: "Please accept the privacy terms to continue" }); return; }
          setError({});
          setBusy(true);
          setProgress("Creating your account…");
          const value = result.data;
          setTimeout(() => {
            update((current) => ({ ...current, user: { name: value.fullName, email: value.email, phone: value.phone, school: value.school, region: value.region, city: value.city, grade: value.grade, stream: value.stream, examYear: value.examYear, subjects: value.subjectIds, role: "STUDENT", plan: "FREE", leaderboardOptIn: false, learningStatus: "PROFILE_INCOMPLETE" } }));
            setProgress("Taking you to complete your student profile…");
            router.push("/profile?welcome=1");
          }, 500);
        }}>
          {Object.keys(error).length > 0 && <p id="form-errors" tabIndex={-1} role="alert" className="sm:col-span-2 rounded-xl bg-error/10 p-3 text-sm text-error">Please fix the highlighted fields.</p>}
          <Field label="Full name" error={error.fullName}>{(id, attributes) => <input id={id} name="fullname" autoComplete="name" className={inputCls} {...attributes} />}</Field>
          <Field label="Email" error={error.email}>{(id, attributes) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...attributes} />}</Field>
          <Field label="Phone number" error={error.phone} hint="e.g. 0911 223 344">{(id, attributes) => <input id={id} name="phone" type="tel" autoComplete="tel" className={inputCls} {...attributes} />}</Field>
          <Field label="School" error={error.school}>{(id, attributes) => <input id={id} name="school" className={inputCls} {...attributes} />}</Field>
          <Field label="Region" error={error.region}>{(id, attributes) => <select id={id} name="region" className={inputCls} defaultValue="" {...attributes}><option value="" disabled>Select region</option>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select>}</Field>
          <Field label="City" error={error.city}>{(id, attributes) => <input id={id} name="city" className={inputCls} {...attributes} />}</Field>
          <Field label="Grade" error={error.grade}>{(id, attributes) => <select id={id} name="grade" className={inputCls} defaultValue="12" {...attributes}><option value="12">Grade 12</option></select>}</Field>
          <Field label="Educational stream" error={error.stream}>{(id, attributes) => <select id={id} name="stream" className={inputCls} defaultValue="" {...attributes}><option value="" disabled>Select stream</option>{STREAMS.map((stream) => <option key={stream}>{stream}</option>)}</select>}</Field>
          <Field label="Exam year" error={error.examYear}>{(id, attributes) => <input id={id} name="year" type="number" defaultValue={2027} className={inputCls} {...attributes} />}</Field>
          <div className="hidden sm:block" />
          <Field label="Password" error={error.password} hint="At least 10 characters with a letter and a number">{(id, attributes) => <input id={id} name="password" type="password" autoComplete="new-password" className={inputCls} {...attributes} />}</Field>
          <Field label="Confirm password" error={error.confirmPassword}>{(id, attributes) => <input id={id} name="confirm" type="password" autoComplete="new-password" className={inputCls} {...attributes} />}</Field>
          <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{SUBJECTS.map((subject) => <label key={subject.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" name="subjects" value={subject.id} defaultChecked />{subject.name}</label>)}</div>{error.subjectIds && <p className="mt-1 text-xs text-error">{error.subjectIds}</p>}</fieldset>
          <div className="sm:col-span-2"><label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1 shrink-0" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span className="min-w-0">I agree to the <Link href="/privacy" className="underline">privacy terms</Link>. If I am under 18, a parent or guardian is aware I am using Dibora.</span></label>{error.consent && <p className="mt-1 text-xs text-error">{error.consent}</p>}</div>
          <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button>
        </form>
        <p className="mt-4 text-sm">Already registered? <Link href="/login" className="text-primary underline">Log in</Link></p>
      </Card>
    </div>
  );
}

export default function Page() {
  return <AuthLayout mode="register">{DEMO ? <DemoAuthMethodChoice label="Choose how to create your account"><DemoRegister /></DemoAuthMethodChoice> : <LiveRegister />}</AuthLayout>;
}
