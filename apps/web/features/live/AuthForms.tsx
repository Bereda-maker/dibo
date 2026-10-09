"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { registerSchema, loginSchema } from "@dibora/validation";
import { Button, Card, Field, ErrorState, inputCls } from "../../components/ui";
import { api, ApiError, fieldErrors } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { REGIONS, STREAMS } from "../../lib/config";

type Providers = { google: { clientId: string } | null; telegram: { botUsername: string } | null };
type GoogleApi = { accounts: { id: { initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } } };
let gsiLoading: Promise<void> | null = null;
const loadGsi = () => (gsiLoading ??= new Promise<void>((res, rej) => { const el = document.createElement("script"); el.src = "https://accounts.google.com/gsi/client"; el.async = true; el.onload = () => res(); el.onerror = () => { gsiLoading = null; rej(new Error("gsi")); }; document.head.appendChild(el); }));

/** "Continue with Google / Telegram". Buttons come from the providers' own scripts; the API verifies the result and sets the session cookie. */
function SocialLogin() {
  const { refresh } = useSession(); const router = useRouter(); const [p, setP] = useState<Providers | null>(null); const [err, setErr] = useState("");
  const g = useRef<HTMLDivElement>(null); const t = useRef<HTMLDivElement>(null);
  const submit = async (path: "google" | "telegram", body: unknown) => {
    setErr("");
    try { const r = await api<{ role: string; isNew: boolean }>(`/auth/${path}`, { method: "POST", body }); await refresh(); router.push(r.isNew ? "/profile?welcome=1" : r.role === "STUDENT" ? "/dashboard" : "/admin"); }
    catch (x) { setErr(x instanceof ApiError && x.status === 429 ? "Too many attempts. Please wait a minute." : x instanceof ApiError ? x.message : "Sign-in failed. Please try again."); }
  };
  useEffect(() => { api<Providers>("/auth/providers").then(setP).catch(() => setP({ google: null, telegram: null })); }, []);
  useEffect(() => {
    const cid = p?.google?.clientId; if (!cid || !g.current) return; let off = false; const el = g.current;
    loadGsi().then(() => { if (off) return; const gg = (window as unknown as { google?: GoogleApi }).google; if (!gg) return; gg.accounts.id.initialize({ client_id: cid, callback: (r) => void submit("google", { credential: r.credential }) }); gg.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: Math.min(320, el.clientWidth || 320) }); }).catch(() => setErr("Google sign-in could not load. Check your connection."));
    return () => { off = true; };
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const bot = p?.telegram?.botUsername; if (!bot || !t.current) return; const el = t.current;
    (window as unknown as { onDiboraTelegramAuth?: (u: unknown) => void }).onDiboraTelegramAuth = (u) => void submit("telegram", u);
    const sc = document.createElement("script"); sc.src = "https://telegram.org/js/telegram-widget.js?22"; sc.async = true; sc.setAttribute("data-telegram-login", bot); sc.setAttribute("data-size", "large"); sc.setAttribute("data-radius", "20"); sc.setAttribute("data-onauth", "onDiboraTelegramAuth(user)");
    el.appendChild(sc); return () => { el.replaceChildren(); };
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || (!p.google && !p.telegram)) return null;
  return <div className="mt-5"><div className="flex flex-col items-center gap-3">{p.google && <div ref={g} className="flex min-h-[44px] w-full justify-center" />}{p.telegram && <div ref={t} className="flex min-h-[44px] w-full justify-center" />}</div>
    {err && <p role="alert" className="mt-3 text-center text-sm text-error">{err}</p>}
    <p className="mt-3 text-center text-xs text-muted">By continuing you accept our <Link href="/privacy" className="underline">privacy terms</Link>.</p>
    <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or use your email<span className="h-px flex-1 bg-border" /></div></div>;
}

export function LiveLogin() {
  const { refresh } = useSession(); const router = useRouter(); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  return <div className="mx-auto max-w-md px-4 py-12"><Card><h1 className="text-2xl font-bold">Welcome back</h1><SocialLogin />
    <form noValidate className="mt-5 space-y-4" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const r = loginSchema.safeParse({ email: f.get("email"), password: f.get("password") });
      if (!r.success) { setErr({ email: r.error.flatten().fieldErrors.email ? "Enter a valid email address" : "", password: r.error.flatten().fieldErrors.password ? "Enter your password" : "" }); return; }
      setErr({}); setBusy(true);
      try { const res = await api<{ role: string }>("/auth/login", { method: "POST", body: r.data }); await refresh(); router.push(res.role === "STUDENT" ? "/dashboard" : "/admin"); }
      catch (x) { setErr({ form: x instanceof ApiError && x.status === 429 ? "Too many attempts. Please wait a minute." : x instanceof ApiError ? x.message : "Login failed" }); } finally { setBusy(false); } }}>
      <Field label="Email" error={err.email}>{(id, a) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...a} />}</Field>
      <Field label="Password" error={err.password}>{(id, a) => <input id={id} name="password" type="password" autoComplete="current-password" className={inputCls} {...a} />}</Field>
      {err.form && <p role="alert" className="text-sm text-error">{err.form}</p>}<Button type="submit" loading={busy} className="w-full">Log in</Button></form>
    <p className="mt-4 text-sm"><Link href="/forgot-password" className="text-primary underline">Forgot password?</Link> · <Link href="/register" className="text-primary underline">Create account</Link></p></Card></div>;
}

type Subj = { id: string; names: Record<string, string> };
export function LiveRegister() {
  const { refresh } = useSession(); const router = useRouter(); const subj = useApi(() => api<Subj[]>("/public/subjects"));
  const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [consent, setConsent] = useState(false);
  if (subj.error) return <div className="mx-auto max-w-md p-6"><ErrorState message={subj.error.message} onRetry={subj.reload} /></div>;
  return <div className="mx-auto max-w-2xl px-4 py-10"><Card><h1 className="text-2xl font-bold">Create your account</h1><p className="mt-1 text-sm text-muted">We collect only what we need. Your details are never shown publicly.</p><SocialLogin />
    <form noValidate className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget);
      const body = { fullName: f.get("fullname"), email: f.get("email"), phone: f.get("phone"), password: f.get("password"), confirmPassword: f.get("confirm"), educationLevel: "SECONDARY", grade: Number(f.get("grade")), school: f.get("school"), region: f.get("region"), city: f.get("city"), stream: f.get("stream"), examYear: Number(f.get("year")), subjectIds: f.getAll("subjects") };
      const r = registerSchema.safeParse(body); if (!r.success) { const m: Record<string, string> = {}; for (const i of r.error.issues) m[String(i.path[0])] = i.message; setErr(m); return; }
      if (!consent) { setErr({ consent: "Please accept the privacy terms to continue" }); return; }
      setErr({}); setBusy(true);
      try { await api("/auth/register", { method: "POST", body: r.data }); await api("/auth/login", { method: "POST", body: { email: r.data.email, password: r.data.password } }); await refresh(); router.push("/profile?welcome=1"); }
      catch (x) { const fe = fieldErrors(x); setErr(Object.keys(fe).length ? fe : { form: x instanceof ApiError ? x.message : "Registration failed" }); } finally { setBusy(false); } }}>
      {(Object.keys(err).length > 0) && <p role="alert" className="sm:col-span-2 rounded-xl bg-error/10 p-3 text-sm text-error">{err.form ?? "Please fix the highlighted fields."}</p>}
      <Field label="Full name" error={err.fullName}>{(id, a) => <input id={id} name="fullname" autoComplete="name" className={inputCls} {...a} />}</Field>
      <Field label="Email" error={err.email}>{(id, a) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...a} />}</Field>
      <Field label="Phone number" error={err.phone} hint="e.g. 0911 223 344">{(id, a) => <input id={id} name="phone" type="tel" className={inputCls} {...a} />}</Field>
      <Field label="School" error={err.school}>{(id, a) => <input id={id} name="school" className={inputCls} {...a} />}</Field>
      <Field label="Region" error={err.region}>{(id, a) => <select id={id} name="region" defaultValue="" className={inputCls} {...a}><option value="" disabled>Select region</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
      <Field label="City" error={err.city}>{(id, a) => <input id={id} name="city" className={inputCls} {...a} />}</Field>
      <Field label="Grade" error={err.grade}>{(id, a) => <select id={id} name="grade" defaultValue="12" className={inputCls} {...a}><option value="12">Grade 12</option></select>}</Field>
      <Field label="Educational stream" error={err.stream}>{(id, a) => <select id={id} name="stream" defaultValue="" className={inputCls} {...a}><option value="" disabled>Select stream</option>{STREAMS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
      <Field label="Exam year" error={err.examYear}>{(id, a) => <input id={id} name="year" type="number" defaultValue={2027} className={inputCls} {...a} />}</Field><div className="hidden sm:block" />
      <Field label="Password" error={err.password} hint="At least 10 characters with a letter and a number">{(id, a) => <input id={id} name="password" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <Field label="Confirm password" error={err.confirmPassword}>{(id, a) => <input id={id} name="confirm" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Subjects</legend><div className="flex flex-wrap gap-2">{(subj.data ?? []).map((s) => <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" name="subjects" value={s.id} defaultChecked />{s.names.en}</label>)}{subj.loading && <span className="text-sm text-muted">Loading subjects…</span>}</div>{err.subjectIds && <p className="mt-1 text-xs text-error">{err.subjectIds}</p>}</fieldset>
      <div className="sm:col-span-2"><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I agree to the <Link href="/privacy" className="underline">privacy terms</Link>. If I am under 18, a parent or guardian is aware I am using Dibora.</label>{err.consent && <p className="mt-1 text-xs text-error">{err.consent}</p>}</div>
      <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button></form>
    <p className="mt-4 text-sm">Already registered? <Link href="/login" className="text-primary underline">Log in</Link></p></Card></div>;
}
