"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { Button, Field, inputCls } from "../../../components/ui";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";
import { ApiError, api } from "../../../lib/api";

type Errors = Record<string, string>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const message = String(values.get("message") ?? "").trim();
    const website = String(values.get("website") ?? "");
    const errors: Errors = {};
    if (name.length < 2) errors.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email";
    if (message.length < 10) errors.message = "Write at least 10 characters";
    setErr(errors);
    setSubmitError("");
    if (Object.keys(errors).length) return;

    setSending(true);
    try {
      await api<{ received: boolean }>("/contact", { method: "POST", body: { name, email, message, website } });
      setSent(true);
    } catch (cause) {
      setSubmitError(cause instanceof ApiError ? cause.message : "We couldn't send your message. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="Talk to Dibora" title="Questions, ideas or feedback?" description="Send a note about your learning experience, a partnership idea or something you would like us to improve." />
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="h-fit rounded-3xl bg-secondary p-6 text-white shadow-card sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-accent"><MessageCircle size={22} aria-hidden="true" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/60">We value your perspective</p>
          <h2 className="mt-2 text-2xl font-extrabold">Help us make study feel more focused.</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">Tell us what is working, where you got stuck, or what would make your next study session better.</p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><p className="text-xs leading-5 text-white/70">Please do not include passwords, payment details or sensitive personal information in feedback.</p></div>
        </aside>
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="mb-5"><h2 className="text-xl font-extrabold">Send a message</h2><p className="mt-1 text-sm leading-6 text-muted">A name, a way to reply and a little context helps us understand your note.</p></div>
          {sent ? (
            <div role="status" className="rounded-2xl border border-accent/25 bg-accent/10 p-5"><p className="font-bold">Your message was sent.</p><p className="mt-2 text-sm leading-6 text-muted">It is now in the Dibora support inbox. The team can use the email you provided to reply.</p></div>
          ) : (
            <form noValidate className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" error={err.name}>{(id, attrs) => <input id={id} name="name" autoComplete="name" className={inputCls} disabled={sending} {...attrs} />}</Field><Field label="Email" error={err.email}>{(id, attrs) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} disabled={sending} {...attrs} />}</Field></div>
              <Field label="Message" error={err.message}>{(id, attrs) => <textarea id={id} name="message" rows={6} className={inputCls} placeholder="Tell us what is on your mind…" disabled={sending} {...attrs} />}</Field>
              <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label htmlFor="website">Leave this field empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
              {submitError && <p role="alert" className="rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-sm text-error">{submitError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted">Messages go to the secure Dibora support inbox.</p><Button type="submit" disabled={sending} className="group">{sending ? <>Sending… <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /></> : <>Send message <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></>}</Button></div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
