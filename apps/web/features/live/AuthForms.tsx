"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

import { registerSchema, loginSchema } from "@dibora/validation";
import { Button, Card, Field, ErrorState, inputCls } from "../../components/ui";
import { AuthRedirectProgress } from "../../components/AuthRedirectProgress";
import { api, ApiError, fieldErrors } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { REGIONS, STREAMS } from "../../lib/config";

type AuthMethod = "telegram" | "google" | "email";
type SocialProvider = Exclude<AuthMethod, "email">;
type Providers = { google: { clientId: string } | null; telegram: { botUsername: string } | null };
type GoogleApi = { accounts: { id: { initialize: (options: { client_id: string; callback: (result: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void } } };
type Subj = { id: string; names: Record<string, string> };

let gsiLoading: Promise<void> | null = null;
const loadGsi = () => (gsiLoading ??= new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => { gsiLoading = null; reject(new Error("gsi")); };
  document.head.appendChild(script);
}));

function ProviderMark({ provider }: { provider: SocialProvider }) {
  // Use the provider-owned marks from Google Identity Services and Telegram.
  const src = provider === "telegram" ? "/brand/telegram.svg" : "/brand/google-g.png";
  return (
    <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center ${provider === "google" ? "rounded-full bg-white" : ""}`}>
      <Image src={src} alt="" width={20} height={20} unoptimized className="h-5 w-5 object-contain" />
    </span>
  );
}

function MethodTabs({ value, onChange, label }: { value: AuthMethod; onChange: (method: AuthMethod) => void; label: string }) {
  const methods: { value: AuthMethod; label: string; icon: ReactNode }[] = [
    { value: "telegram", label: "Telegram", icon: <ProviderMark provider="telegram" /> },
    { value: "google", label: "Google", icon: <ProviderMark provider="google" /> },
    { value: "email", label: "Email", icon: <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /> },
  ];
  const buttonClass = (active: boolean) => `inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm ${active ? "bg-surface text-primary shadow-sm ring-1 ring-border/70" : "text-muted hover:bg-surface/60 hover:text-text"}`;
  return (
    <div role="group" aria-label={label} className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background/80 p-1.5">
      {methods.map((method) => (
        <button key={method.value} type="button" aria-pressed={value === method.value} onClick={() => onChange(method.value)} className={buttonClass(value === method.value)}>
          {method.icon}{method.label}
        </button>
      ))}
    </div>
  );
}

export function DemoAuthMethodChoice({ children, label }: { children: ReactNode; label: string }) {
  const [method, setMethod] = useState<AuthMethod>("email");
  return (
    <div className="mx-auto w-full max-w-2xl">
      <MethodTabs value={method} onChange={setMethod} label={label} />
      {method === "email" ? children : method === "telegram" ? (
        <div role="status" className="rounded-3xl border border-border bg-background/70 p-5 text-sm leading-6 text-muted sm:p-6">
          <h2 className="font-bold text-text">Telegram sign-in needs Live mode</h2>
          <p className="mt-2">This browser-only demo has no authentication API. To sign in with @DiboraStudentBot, use Live mode and configure the Dibora API; email demo access remains available here.</p>
        </div>
      ) : (
        <div role="status" className="rounded-3xl border border-border bg-background/70 p-5 text-sm leading-6 text-muted sm:p-6">
          <h2 className="font-bold text-text">Google sign-in needs Live mode</h2>
          <p className="mt-2">This browser-only demo has no authentication API. Use Live mode with Google sign-in configured on the Dibora API; email demo access remains available here.</p>
        </div>
      )}
    </div>
  );
}

/** Uses the repository's existing Google Identity Services and Telegram Login Widget endpoints. */
function SocialLogin({ provider }: { provider: SocialProvider }) {
  const { refresh } = useSession();
  const router = useRouter();
  const [providers, setProviders] = useState<Providers | null>(null);
  const [error, setError] = useState("");
  const [providerLoadError, setProviderLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const submittingRef = useRef(false);
  const googleHost = useRef<HTMLDivElement>(null);
  const telegramHost = useRef<HTMLDivElement>(null);

  const submit = async (path: SocialProvider, body: unknown) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    setProgress(path === "google" ? "Verifying your Google sign-in…" : "Verifying your Telegram sign-in…");
    let redirectStarted = false;
    try {
      const result = await api<{ role: string; isNew: boolean }>(`/auth/${path}`, { method: "POST", body });
      await refresh();
      const destination = result.isNew ? "/profile?welcome=1" : result.role === "STUDENT" ? "/dashboard" : "/admin";
      setProgress(result.isNew ? "Taking you to finish your student profile…" : result.role === "STUDENT" ? "Opening your dashboard…" : "Opening your admin space…");
      router.push(destination);
      redirectStarted = true;
    } catch (cause) {
      setProgress("");
      setError(cause instanceof ApiError && cause.status === 429 ? "Too many attempts. Please wait a minute." : cause instanceof ApiError ? cause.message : "Sign-in failed. Please try again.");
    } finally {
      if (!redirectStarted) {
        setBusy(false);
        submittingRef.current = false;
      }
    }
  };

  useEffect(() => {
    let active = true;
    api<Providers>("/auth/providers").then((value) => { if (active) { setProviders(value); setProviderLoadError(false); } }).catch(() => { if (active) { setProviders({ google: null, telegram: null }); setProviderLoadError(true); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const clientId = provider === "google" ? providers?.google?.clientId : undefined;
    if (!clientId || !googleHost.current) return;
    let cancelled = false;
    const element = googleHost.current;
    loadGsi().then(() => {
      if (cancelled) return;
      const google = (window as unknown as { google?: GoogleApi }).google;
      if (!google) return;
      google.accounts.id.initialize({ client_id: clientId, callback: (result) => void submit("google", { credential: result.credential }) });
      google.accounts.id.renderButton(element, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: Math.min(320, element.clientWidth || 320) });
    }).catch(() => setError("Google sign-in could not load. Check your connection."));
    return () => { cancelled = true; element.replaceChildren(); };
  }, [provider, providers?.google?.clientId]); // submit intentionally uses the current component state.

  useEffect(() => {
    const bot = provider === "telegram" ? providers?.telegram?.botUsername : undefined;
    if (!bot || !telegramHost.current) return;
    const element = telegramHost.current;
    const widgetWindow = window as unknown as { onDiboraTelegramAuth?: (user: unknown) => void };
    const callback = (user: unknown) => void submit("telegram", user);
    widgetWindow.onDiboraTelegramAuth = callback;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "20");
    script.setAttribute("data-onauth", "onDiboraTelegramAuth(user)");
    element.appendChild(script);
    return () => {
      element.replaceChildren();
      if (widgetWindow.onDiboraTelegramAuth === callback) delete widgetWindow.onDiboraTelegramAuth;
    };
  }, [provider, providers?.telegram?.botUsername]); // submit intentionally uses the current component state.

  if (provider === "telegram") {
    if (!providers) return <p role="status" className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted">Connecting to Telegram…</p>;
    if (providerLoadError) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Dibora couldn’t reach Telegram sign-in right now. Please try again later, or choose Google or Email.</div>;
    if (!providers.telegram) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Telegram sign-in is not configured yet. You can choose Google or Email instead.</div>;
    return (
      <>
      <AuthRedirectProgress message={progress || null} />
      <div aria-busy={busy} className="rounded-3xl border border-border bg-background/70 p-5 text-center sm:p-6">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#229ED9]/10"><ProviderMark provider="telegram" /></div>
        <h2 className="font-bold text-text">Continue with Telegram</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">Use @{providers.telegram.botUsername} to sign in or create an account. New students finish a short profile next.</p>
        <div ref={telegramHost} className={`mt-5 flex min-h-12 items-center justify-center ${busy ? "pointer-events-none opacity-60" : ""}`} />
        {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />Telegram verification is checked by Dibora’s API.</p>
      </div>
      </>
    );
  }

  if (!providers) return <p role="status" className="rounded-2xl border border-border bg-background/70 p-4 text-center text-sm text-muted">Connecting to Google…</p>;
  if (providerLoadError) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Dibora couldn’t reach Google sign-in right now. Please try again later, or choose Telegram or Email.</div>;
  if (!providers.google) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Google sign-in is not configured on the Dibora API yet. You can choose Telegram or Email instead.</div>;
  return (
    <>
    <AuthRedirectProgress message={progress || null} />
    <div aria-busy={busy} className="rounded-3xl border border-border bg-background/70 p-5 text-center sm:p-6">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><ProviderMark provider="google" /></div>
      <h2 className="font-bold text-text">Continue with Google</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">Use your Google account to sign in or create an account. New students finish a short profile next.</p>
      <div ref={googleHost} className={`mt-5 flex min-h-[44px] w-full justify-center ${busy ? "pointer-events-none opacity-60" : ""}`} />
      {error && <p role="alert" className="mt-3 text-center text-sm text-error">{error}</p>}
    </div>
    </>
  );
}

export function LiveLogin() {
  const { refresh } = useSession();
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("telegram");
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("method");
    if (requested === "telegram" || requested === "google" || requested === "email") setMethod(requested);
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl">
      <AuthRedirectProgress message={progress} />
      <div className="mb-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Your learning space</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">Welcome back.</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Use Telegram or Google to get back in quickly, or sign in with Email.</p>
      </div>
      <MethodTabs value={method} onChange={(value) => { setMethod(value); setError({}); setProgress(null); }} label="Choose how to sign in" />

      {method === "email" ? (
        <>
          <Card>
            <form noValidate className="space-y-4" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const result = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
              if (!result.success) {
                const fields = result.error.flatten().fieldErrors;
                setError({ email: fields.email?.[0] ? "Enter a valid email address" : "", password: fields.password?.[0] ? "Enter your password" : "" });
                return;
              }
              setError({});
              setBusy(true);
              setProgress("Checking your login…");
              let redirectStarted = false;
              try {
                const response = await api<{ role: string }>("/auth/login", { method: "POST", body: result.data });
                await refresh();
                const destination = response.role === "STUDENT" ? "/dashboard" : "/admin";
                setProgress(response.role === "STUDENT" ? "Opening your dashboard…" : "Opening your admin space…");
                router.push(destination);
                redirectStarted = true;
              } catch (cause) {
                setProgress(null);
                setError({ form: cause instanceof ApiError && cause.status === 429 ? "Too many attempts. Please wait a minute." : cause instanceof ApiError ? cause.message : "Login failed" });
              } finally {
                if (!redirectStarted) setBusy(false);
              }
            }}>
              <Field label="Email" error={error.email}>{(id, attributes) => <input id={id} name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputCls} {...attributes} />}</Field>
              <Field label="Password" error={error.password}>{(id, attributes) => <input id={id} name="password" type="password" autoComplete="current-password" placeholder="Your password" className={inputCls} {...attributes} />}</Field>
              {error.form && <p role="alert" className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">{error.form}</p>}
              <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Forgot password?</Link></div>
              <Button type="submit" loading={busy} className="group w-full rounded-xl py-3">Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Button>
            </form>
          </Card>
          <p className="mt-5 text-center text-sm text-muted">New to Dibora? <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">Create an account</Link></p>
        </>
      ) : (
        <div className="space-y-5">
          <SocialLogin provider={method} />
          <p className="text-center text-sm text-muted">New to Dibora? {method === "google" ? "Google" : "Telegram"} can create your account; you’ll complete your student profile next.</p>
        </div>
      )}
    </div>
  );
}

export function LiveRegister() {
  const { refresh } = useSession();
  const router = useRouter();
  const subjectsResult = useApi(() => api<Subj[]>("/public/subjects"));
  const [method, setMethod] = useState<AuthMethod>("telegram");
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("method");
    if (requested === "telegram" || requested === "google" || requested === "email") setMethod(requested);
  }, []);

  if (subjectsResult.error) return <div className="mx-auto max-w-md p-6"><ErrorState message={subjectsResult.error.message} onRetry={subjectsResult.reload} /></div>;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AuthRedirectProgress message={progress} />
      <div className="mb-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Start with a clear plan</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">Create your account.</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Start with Telegram, continue with Google, or sign up with Email. New students finish a short profile next.</p>
      </div>
      <MethodTabs value={method} onChange={(value) => { setMethod(value); setError({}); setProgress(null); }} label="Choose how to create your account" />

      {method === "email" ? (
        <>
          <Card>
            <p className="mb-5 text-sm leading-6 text-muted">We collect only what we need. Your details stay private while we build your study plan.</p>
            <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const body = { fullName: form.get("fullname"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), confirmPassword: form.get("confirm"), educationLevel: "SECONDARY", grade: Number(form.get("grade")), school: form.get("school"), region: form.get("region"), city: form.get("city"), stream: form.get("stream"), examYear: Number(form.get("year")), subjectIds: form.getAll("subjects") };
              const result = registerSchema.safeParse(body);
              if (!result.success) {
                const fields: Record<string, string> = {};
                for (const issue of result.error.issues) fields[String(issue.path[0])] = issue.message;
                setError(fields);
                document.getElementById("register-errors")?.focus();
                return;
              }
              if (!consent) { setError({ consent: "Please accept the privacy terms to continue" }); return; }
              setError({});
              setBusy(true);
              setProgress("Creating your account…");
              let redirectStarted = false;
              try {
                await api("/auth/register", { method: "POST", body: result.data });
                await api("/auth/login", { method: "POST", body: { email: result.data.email, password: result.data.password } });
                await refresh();
                setProgress("Taking you to complete your student profile…");
                router.push("/profile?welcome=1");
                redirectStarted = true;
              } catch (cause) {
                setProgress(null);
                const fieldErrorsByName = fieldErrors(cause);
                setError(Object.keys(fieldErrorsByName).length ? fieldErrorsByName : { form: cause instanceof ApiError ? cause.message : "Registration failed" });
              } finally {
                if (!redirectStarted) setBusy(false);
              }
            }}>
              {Object.keys(error).length > 0 && <p id="register-errors" tabIndex={-1} role="alert" className="sm:col-span-2 rounded-2xl border border-error/20 bg-error/10 p-3 text-sm text-error">{error.form ?? "Please fix the highlighted fields."}</p>}
              <Field label="Full name" error={error.fullName}>{(id, attributes) => <input id={id} name="fullname" autoComplete="name" placeholder="Your full name" className={inputCls} {...attributes} />}</Field>
              <Field label="Email" error={error.email}>{(id, attributes) => <input id={id} name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputCls} {...attributes} />}</Field>
              <Field label="Phone number" error={error.phone} hint="e.g. 0911 223 344">{(id, attributes) => <input id={id} name="phone" type="tel" autoComplete="tel" className={inputCls} {...attributes} />}</Field>
              <Field label="School" error={error.school}>{(id, attributes) => <input id={id} name="school" className={inputCls} {...attributes} />}</Field>
              <Field label="Region" error={error.region}>{(id, attributes) => <select id={id} name="region" defaultValue="" className={inputCls} {...attributes}><option value="" disabled>Select region</option>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select>}</Field>
              <Field label="City" error={error.city}>{(id, attributes) => <input id={id} name="city" className={inputCls} {...attributes} />}</Field>
              <Field label="Grade" error={error.grade}>{(id, attributes) => <select id={id} name="grade" defaultValue="12" className={inputCls} {...attributes}><option value="12">Grade 12</option></select>}</Field>
              <Field label="Educational stream" error={error.stream}>{(id, attributes) => <select id={id} name="stream" defaultValue="" className={inputCls} {...attributes}><option value="" disabled>Select stream</option>{STREAMS.map((stream) => <option key={stream}>{stream}</option>)}</select>}</Field>
              <Field label="Exam year" error={error.examYear}>{(id, attributes) => <input id={id} name="year" type="number" defaultValue={2027} className={inputCls} {...attributes} />}</Field>
              <div className="hidden sm:block" />
              <Field label="Password" error={error.password} hint="At least 10 characters with a letter and a number">{(id, attributes) => <input id={id} name="password" type="password" autoComplete="new-password" className={inputCls} {...attributes} />}</Field>
              <Field label="Confirm password" error={error.confirmPassword}>{(id, attributes) => <input id={id} name="confirm" type="password" autoComplete="new-password" className={inputCls} {...attributes} />}</Field>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1 text-sm font-medium">Subjects</legend>
                <div className="flex flex-wrap gap-2">{(subjectsResult.data ?? []).map((subject) => <label key={subject.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" name="subjects" value={subject.id} defaultChecked />{subject.names.en}</label>)}{subjectsResult.loading && <span className="text-sm text-muted">Loading subjects…</span>}</div>
                {error.subjectIds && <p className="mt-1 text-xs text-error">{error.subjectIds}</p>}
              </fieldset>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1 shrink-0" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span className="min-w-0">I agree to the <Link href="/privacy" className="underline">privacy terms</Link>. If I am under 18, a parent or guardian is aware I am using Dibora.</span></label>
                {error.consent && <p className="mt-1 text-xs text-error">{error.consent}</p>}
              </div>
              <Button type="submit" loading={busy} className="sm:col-span-2">Create account</Button>
            </form>
          </Card>
          <p className="mt-5 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Log in</Link></p>
        </>
      ) : (
        <div className="space-y-5">
          <SocialLogin provider={method} />
          <p className="text-center text-sm text-muted">Already have an account? <Link href={`/login?method=${method}`} className="font-semibold text-primary underline-offset-4 hover:underline">Continue with {method === "google" ? "Google" : "Telegram"}</Link></p>
        </div>
      )}
    </div>
  );
}
