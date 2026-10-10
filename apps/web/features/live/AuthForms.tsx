"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { useRouter } from "next/navigation";
import { DEMO } from "../../lib/config";
import { finishNavigationProgress, startNavigationProgress } from "../../components/NavigationProgress";

type Provider = "telegram" | "google";
type Providers = { google: { clientId: string } | null; telegram: { botUsername: string } | null };
type GoogleApi = { accounts: { id: { initialize: (options: { client_id: string; callback: (result: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void } } };
let gsiLoading: Promise<void> | null = null;
let gsiInitialized = false;
let googleCredentialHandler: ((credential: string) => void) | null = null;
const loadGsi = () => (gsiLoading ??= new Promise<void>((resolve, reject) => {
  const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true;
  script.onload = () => resolve(); script.onerror = () => { gsiLoading = null; reject(new Error("gsi")); }; document.head.appendChild(script);
}));

function ProviderTabs({ value, onChange }: { value: Provider; onChange: (provider: Provider) => void }) {
  const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition sm:px-5";
  return <div role="group" aria-label="Choose a sign-in provider" className="mb-5 grid grid-cols-2 rounded-2xl border border-border bg-background/80 p-1.5">
    <button type="button" aria-pressed={value === "google"} onClick={() => onChange("google")} className={`${base} ${value === "google" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}><span aria-hidden="true" className="font-extrabold text-[#4285F4]">G</span> Google</button>
    <button type="button" aria-pressed={value === "telegram"} onClick={() => onChange("telegram")} className={`${base} ${value === "telegram" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}><Send className="h-4 w-4 text-[#168ac0]" aria-hidden="true" /> Telegram</button>
  </div>;
}

function SocialLogin({ provider }: { provider: Provider }) {
  const { refresh } = useSession(); const router = useRouter(); const [providers, setProviders] = useState<Providers | null>(null);
  const [error, setError] = useState(""); const [providerLoadError, setProviderLoadError] = useState(false); const [submitting, setSubmitting] = useState(false);
  const googleHost = useRef<HTMLDivElement>(null); const telegramHost = useRef<HTMLDivElement>(null); const submittingRef = useRef(false);
  const submit = async (path: Provider, body: unknown) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    startNavigationProgress();
    try { const result = await api<{ role: string; isNew: boolean }>(`/auth/${path}`, { method: "POST", body }); await refresh(); router.push(result.isNew ? "/profile?welcome=1" : result.role === "STUDENT" ? "/dashboard" : "/admin"); }
    catch (cause) { submittingRef.current = false; setError(cause instanceof ApiError && cause.status === 429 ? "Too many attempts. Please wait a minute." : cause instanceof ApiError ? cause.message : "Sign-in failed. Please try again."); setSubmitting(false); finishNavigationProgress(); }
  };
  useEffect(() => {
    let active = true; api<Providers>("/auth/providers").then((value) => { if (active) { setProviders(value); setProviderLoadError(false); } }).catch(() => { if (active) { setProviders({ google: null, telegram: null }); setProviderLoadError(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const clientId = provider === "google" ? providers?.google?.clientId : undefined; if (!clientId || !googleHost.current) return;
    let cancelled = false; const element = googleHost.current;
    const credentialHandler = (credential: string) => { void submit("google", { credential }); };
    loadGsi().then(() => { if (cancelled) return; const google = (window as unknown as { google?: GoogleApi }).google; if (!google) return;
      googleCredentialHandler = credentialHandler;
      if (!gsiInitialized) {
        google.accounts.id.initialize({ client_id: clientId, callback: (result) => googleCredentialHandler?.(result.credential) });
        gsiInitialized = true;
      }
      google.accounts.id.renderButton(element, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: Math.min(320, element.clientWidth || 320) });
    }).catch(() => setError("Google sign-in could not load. Check your connection."));
    return () => { cancelled = true; element.replaceChildren(); if (googleCredentialHandler === credentialHandler) googleCredentialHandler = null; };
  }, [provider, providers?.google?.clientId]);
  useEffect(() => {
    const bot = provider === "telegram" ? providers?.telegram?.botUsername : undefined; if (!bot || !telegramHost.current) return;
    const element = telegramHost.current; const widgetWindow = window as unknown as { onDiboraTelegramAuth?: (user: unknown) => void };
    const callback = (user: unknown) => void submit("telegram", user); widgetWindow.onDiboraTelegramAuth = callback;
    const script = document.createElement("script"); script.src = "https://telegram.org/js/telegram-widget.js?22"; script.async = true;
    script.setAttribute("data-telegram-login", bot); script.setAttribute("data-size", "large"); script.setAttribute("data-radius", "20"); script.setAttribute("data-onauth", "onDiboraTelegramAuth(user)"); element.appendChild(script);
    return () => { element.replaceChildren(); if (widgetWindow.onDiboraTelegramAuth === callback) delete widgetWindow.onDiboraTelegramAuth; };
  }, [provider, providers?.telegram?.botUsername]);

  const providerName = provider === "google" ? "Google" : "Telegram";
  if (!providers) return <p role="status" className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted">Connecting to {providerName}…</p>;
  if (providerLoadError) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Dibora could not reach {providerName} sign-in. Please try the other sign-in option or come back later.</div>;
  if (provider === "telegram" && !providers.telegram) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Telegram sign-in is not configured yet. Please choose Google or try again later.</div>;
  if (provider === "google" && !providers.google) return <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-text">Google sign-in is not configured yet. Please choose Telegram or try again later.</div>;
  return provider === "telegram" ? <div aria-busy={submitting} className="rounded-3xl border border-border bg-background/70 p-5 text-center sm:p-6">
    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#229ED9]/10 text-[#168ac0]"><Send className="h-5 w-5" aria-hidden="true" /></div><h2 className="font-bold text-text">Continue with Telegram</h2>
    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">Sign in securely with @{providers.telegram!.botUsername}. New students can create an account here, then complete their Dibora profile.</p>
    {submitting && <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Signing in with Telegram…</p>}
    <div ref={telegramHost} className={`mt-5 flex min-h-12 items-center justify-center ${submitting ? "pointer-events-none opacity-50" : ""}`} />{error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
    <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />Telegram verification is checked by Dibora’s API.</p>
  </div> : <div aria-busy={submitting} className="rounded-3xl border border-border bg-background/70 p-5 text-center sm:p-6">
    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#4285F4]/10 text-xl font-extrabold text-[#4285F4]">G</div><h2 className="font-bold text-text">Continue with Google</h2>
    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">Use your Google account to sign in or create your Dibora student account.</p>
    {submitting && <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Signing in with Google…</p>}
    <div ref={googleHost} className={`mt-5 flex min-h-[44px] w-full justify-center ${submitting ? "pointer-events-none opacity-50" : ""}`} />{error && <p role="alert" className="mt-3 text-center text-sm text-error">{error}</p>}
  </div>;
}

export function StudentAuthForm({ mode }: { mode: "login" | "register" }) {
  const [provider, setProvider] = useState<Provider>("google");
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("method"); if (requested === "telegram" || requested === "google") setProvider(requested); }, []);
  const isRegister = mode === "register";
  return <div className="mx-auto w-full max-w-xl">
    <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">{isRegister ? "Your study space starts here" : "Your learning space"}</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">{isRegister ? "Create your Dibora account." : "Welcome back."}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{isRegister ? "Choose Google or Telegram. Your student account is created on your first successful sign-in." : "Choose Google or Telegram to continue learning."}</p>
    </div>
    <ProviderTabs value={provider} onChange={setProvider} />
    {DEMO ? <div role="status" className="rounded-3xl border border-border bg-background/70 p-5 text-sm leading-6 text-muted sm:p-6"><h2 className="font-bold text-text">Provider sign-in is not active in demo mode</h2><p className="mt-2">Google and Telegram sign-in are available when the live Dibora API is configured. Email and password sign-in are not offered.</p></div> : <SocialLogin provider={provider} />}
    <p className="mt-5 text-center text-xs leading-5 text-muted">New to Dibora? Your account is created automatically when you first continue with Google or Telegram. You can complete your student profile next.</p>
  </div>;
}
