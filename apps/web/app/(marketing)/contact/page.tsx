"use client";
import { useState } from "react";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { Button, Field, inputCls } from "../../../components/ui";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";

export default function ContactPage() {
  const [sent, setSent] = useState(false); const [err, setErr] = useState<Record<string, string>>({});
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <MarketingPageHeader eyebrow="Talk to Dibora" title="Questions, ideas or feedback?" description="Use the form to draft a note about your learning experience, a partnership idea or something you would like us to improve." />
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="h-fit rounded-3xl bg-secondary p-6 text-white shadow-card sm:p-8"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-accent"><MessageCircle size={22} aria-hidden="true" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/60">We value your perspective</p><h2 className="mt-2 text-2xl font-extrabold">Help us make study feel more focused.</h2><p className="mt-3 text-sm leading-6 text-white/70">Tell us what is working, where you got stuck, or what would make your next study session better.</p><div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><p className="text-xs leading-5 text-white/70">Please do not include passwords, payment details or sensitive personal information in feedback.</p></div></aside>
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8"><div className="mb-5"><h2 className="text-xl font-extrabold">Send a message</h2><p className="mt-1 text-sm leading-6 text-muted">A name, a way to reply and a little context helps us understand your note.</p></div>
          {sent ? <div role="status" className="rounded-2xl border border-accent/25 bg-accent/10 p-5"><p className="font-bold">Thanks for sharing your feedback.</p><p className="mt-2 text-sm leading-6 text-muted">This preview confirms the form locally; message delivery is not connected yet.</p></div> : <><form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const errors: Record<string, string> = {}; if (String(f.get("name")).trim().length < 2) errors.name = "Enter your name"; if (!/^\S+@\S+\.\S+$/.test(String(f.get("email")))) errors.email = "Enter a valid email"; if (String(f.get("message")).trim().length < 10) errors.message = "Write at least 10 characters"; setErr(errors); if (!Object.keys(errors).length) setSent(true); }}>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" error={err.name}>{(id, attrs) => <input id={id} name="name" autoComplete="name" className={inputCls} {...attrs} />}</Field><Field label="Email" error={err.email}>{(id, attrs) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...attrs} />}</Field></div>
            <Field label="Message" error={err.message}>{(id, attrs) => <textarea id={id} name="message" rows={6} className={inputCls} placeholder="Tell us what is on your mind…" {...attrs} />}</Field>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted">Messages are not delivered from this preview yet.</p><Button type="submit" className="group">Review message <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Button></div>
          </form></>}
        </section>
      </div>
    </div>
  );
}
