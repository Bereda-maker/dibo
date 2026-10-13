"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { Card, PageHeader, Skeleton } from "../../../components/ui";
import { DEMO } from "../../../lib/config";
import { ApiError, api } from "../../../lib/api";
import { notifyAdminActionCountsChanged } from "../../../lib/useAdminActionCounts";

type ContactMessage = { id: string; name: string; email: string; message: string; status: "NEW" | "READ" | "RESOLVED"; createdAt: string };
type ContactFilter = "OPEN" | "ALL";
const PAGE_SIZE = 50;

function LiveInbox() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedFilter: ContactFilter = searchParams.get("status") === "OPEN" ? "OPEN" : "ALL";
  const [filter, setFilter] = useState<ContactFilter>(requestedFilter);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { setFilter(requestedFilter); }, [requestedFilter]);

  const loadPage = useCallback(async (pageOffset = 0, append = false) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(pageOffset) });
    if (filter === "OPEN") params.set("status", "OPEN");
    try {
      const rows = await api<ContactMessage[]>(`/admin/contact-messages?${params.toString()}`);
      setMessages((current) => append ? [...current, ...rows] : rows);
      setOffset(pageOffset + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Couldn't load the contact inbox. Please try again."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { setMessages([]); setOffset(0); void loadPage(0, false); }, [loadPage]);

  async function updateStatus(item: ContactMessage, status: ContactMessage["status"]) {
    setUpdating(item.id);
    setError("");
    try {
      await api(`/admin/contact-messages/${item.id}`, { method: "PATCH", body: { status } });
      if (filter === "OPEN" && status === "RESOLVED") setMessages((current) => current.filter((message) => message.id !== item.id));
      else setMessages((current) => current.map((message) => message.id === item.id ? { ...message, status } : message));
      notifyAdminActionCountsChanged();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Couldn't update this message."); }
    finally { setUpdating(null); }
  }

  const filterButton = (value: ContactFilter, label: string) => <button type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); router.replace(value === "OPEN" ? "/admin/contact?status=OPEN" : "/admin/contact", { scroll: false }); }} className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${filter === value ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:bg-bg"}`}>{label}</button>;

  return <>
    <PageHeader title={filter === "OPEN" ? "Open contact requests" : "Contact inbox"} sub="New and read messages stay open until an admin marks them resolved. Review requests here; no sample records are shown." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter contact messages">{filterButton("OPEN", "Open requests")}{filterButton("ALL", "All messages")}</div>
      <button type="button" onClick={() => void loadPage(0, false)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />Refresh</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
    {loading && messages.length === 0 ? <Card aria-busy="true" className="flex items-center gap-3 text-sm text-muted"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Loading messages…</Card> : messages.length === 0 ? <Card className="py-12 text-center"><Inbox size={30} className="mx-auto text-muted" aria-hidden="true" /><h2 className="mt-3 font-bold">{filter === "OPEN" ? "No unresolved requests" : "Your inbox is clear"}</h2><p className="mt-1 text-sm text-muted">{filter === "OPEN" ? "All received contact messages are resolved." : "New messages from the contact form will appear here."}</p></Card> : <div className="space-y-4">{messages.map((item) => <Card key={item.id} className="!p-5 sm:!p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{item.name}</h2><a href={`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("Re: Your message to Deborah")}`} className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">{item.email}<ExternalLink size={13} aria-hidden="true" /></a></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "NEW" ? "bg-info/15 text-info" : item.status === "RESOLVED" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{item.status.toLowerCase()}</span><time className="text-xs text-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div></div>
      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-bg/70 p-4 text-sm leading-6">{item.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">{item.status === "NEW" && <button type="button" disabled={updating === item.id} onClick={() => void updateStatus(item, "READ")} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-bg disabled:opacity-60">Mark read</button>}{item.status !== "RESOLVED" && <button type="button" disabled={updating === item.id} onClick={() => void updateStatus(item, "RESOLVED")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"><Check size={14} aria-hidden="true" />Mark resolved</button>}</div>
    </Card>)}</div>}
    {messages.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted">Showing {messages.length} {filter === "OPEN" ? "open " : ""}message{messages.length === 1 ? "" : "s"}</span>{hasMore && <button type="button" onClick={() => void loadPage(offset, true)} disabled={loading} className="min-h-10 rounded-xl border border-border px-4 font-semibold hover:bg-bg disabled:opacity-60">{loading ? "Loading…" : "Load more"}</button>}</div>}
  </>;
}

function ContactInboxPageInner() {
  return <>{DEMO ? <><PageHeader title="Contact inbox" sub="Messages submitted by visitors through the Deborah contact form." /><Card className="py-10 text-center"><Inbox size={28} className="mx-auto text-muted" aria-hidden="true" /><h2 className="mt-3 font-bold">Live inbox unavailable in demo mode</h2><p className="mt-1 text-sm text-muted">Switch to the live API environment to read submitted contact messages.</p></Card></> : <LiveInbox />}</>;
}

export default function ContactInboxPage() {
  return <Suspense fallback={<Skeleton className="h-60" />}><ContactInboxPageInner /></Suspense>;
}
