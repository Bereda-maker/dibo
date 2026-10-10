"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { Card, PageHeader } from "../../../components/ui";
import { DEMO } from "../../../lib/config";
import { ApiError, api } from "../../../lib/api";

type ContactMessage = { id: string; name: string; email: string; message: string; status: "NEW" | "READ" | "RESOLVED"; createdAt: string };

function LiveInbox() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setMessages(await api<ContactMessage[]>("/admin/contact-messages")); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Couldn't load the contact inbox. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(item: ContactMessage, status: ContactMessage["status"]) {
    setUpdating(item.id);
    setError("");
    try {
      await api(`/admin/contact-messages/${item.id}`, { method: "PATCH", body: { status } });
      setMessages((current) => current.map((message) => message.id === item.id ? { ...message, status } : message));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Couldn't update this message."); }
    finally { setUpdating(null); }
  }

  return <>
    <div className="mb-5 flex justify-end"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />Refresh</button></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
    {loading ? <Card className="flex items-center gap-3 text-sm text-muted"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Loading messages…</Card> : messages.length === 0 ? <Card className="py-12 text-center"><Inbox size={30} className="mx-auto text-muted" aria-hidden="true" /><h2 className="mt-3 font-bold">Your inbox is clear</h2><p className="mt-1 text-sm text-muted">New messages from the contact form will appear here.</p></Card> : <div className="space-y-4">{messages.map((item) => <Card key={item.id} className="!p-5 sm:!p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{item.name}</h2><a href={`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("Re: Your message to Dibora")}`} className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">{item.email}<ExternalLink size={13} aria-hidden="true" /></a></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "NEW" ? "bg-accent/15 text-secondary" : item.status === "RESOLVED" ? "bg-primary/10 text-primary" : "bg-border/70 text-muted"}`}>{item.status.toLowerCase()}</span><time className="text-xs text-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div></div>
      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-bg/70 p-4 text-sm leading-6">{item.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">{item.status === "NEW" && <button type="button" disabled={updating === item.id} onClick={() => void updateStatus(item, "READ")} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-bg disabled:opacity-60">Mark read</button>}{item.status !== "RESOLVED" && <button type="button" disabled={updating === item.id} onClick={() => void updateStatus(item, "RESOLVED")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"><Check size={14} aria-hidden="true" />Mark resolved</button>}</div>
    </Card>)}</div>}
  </>;
}

export default function ContactInboxPage() {
  return <><PageHeader title="Contact inbox" sub="Messages submitted by visitors through the Dibora contact form." />{DEMO ? <Card className="py-10 text-center"><Inbox size={28} className="mx-auto text-muted" aria-hidden="true" /><h2 className="mt-3 font-bold">Live inbox unavailable in demo mode</h2><p className="mt-1 text-sm text-muted">Switch to the live API environment to read submitted contact messages.</p></Card> : <LiveInbox />}</>;
}
