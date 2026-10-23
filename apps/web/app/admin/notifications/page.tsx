"use client";
import { useState } from "react";
import { Bell, Send } from "lucide-react";
import { Button, Card, Field, Modal, PageHeader, Skeleton, ErrorState, inputCls, useToast } from "../../../components/ui";
import { DataTable } from "../../../components/DataTable";
import { useStore } from "../../../lib/store";
import { DEMO } from "../../../lib/config";
import { api, ApiError } from "../../../lib/api";
import { useApi } from "../../../lib/useApi";
type NotificationRow = { id: string; type: string; channel: string; title: string; body: string | null; createdAt: string; recipientCount: number };
function DemoNotificationsPage() {
  const toast = useToast(); const { update } = useStore(); const [t, setT] = useState(""); const [b, setB] = useState(""); const [err, setErr] = useState(""); const [reviewOpen, setReviewOpen] = useState(false);
  const completeDemo = () => { update((s) => ({ ...s, audit: [{ at: new Date().toISOString(), action: `Demo notification: ${t}` }, ...s.audit] })); toast("Demo only — notification not sent"); setT(""); setB(""); setReviewOpen(false); };
  return <><PageHeader title="Notifications" sub="Demo mode — no message is sent." />
    <Card className="max-w-xl"><form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (t.trim().length < 3 || b.trim().length < 3) return setErr("Add a title and a message"); setErr(""); setReviewOpen(true); }}>
      <Field label="Title">{(id) => <input id={id} className={inputCls} value={t} onChange={(e) => setT(e.target.value)} />}</Field><Field label="Message">{(id) => <textarea id={id} rows={3} className={inputCls} value={b} onChange={(e) => setB(e.target.value)} />}</Field>{err && <p role="alert" className="text-sm text-error">{err}</p>}<Button type="submit"><Send size={15} />Review notification</Button></form></Card>
    <Modal open={reviewOpen} title="Review demo notification" onClose={() => setReviewOpen(false)}><div className="space-y-4"><div className="overflow-hidden rounded-2xl border border-border bg-bg/60"><div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-muted"><Bell size={15} className="text-accent" aria-hidden="true" />In-app notification preview</div><div className="p-4"><h3 className="break-words text-base font-bold">{t.trim() || "Untitled notification"}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text">{b.trim() || "No message content yet."}</p></div></div><p className="text-xs leading-5 text-muted">Demo mode does not send messages. Confirming only records the action locally.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setReviewOpen(false)}>Back to edit</Button><Button type="button" onClick={completeDemo}><Send size={15} />Simulate send</Button></div></div></Modal></>;
}
function LiveNotificationsPage() {
  const toast = useToast(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [reviewOpen, setReviewOpen] = useState(false);
  const q = useApi<NotificationRow[]>(() => api<NotificationRow[]>("/admin/notifications?limit=50"), []);
  const send = async () => {
    setBusy(true);
    try {
      const result = await api<{ recipientCount: number }>("/admin/notifications/broadcast", { method: "POST", body: { title: title.trim(), body: body.trim(), confirm: true } });
      toast(`Notification created for ${result.recipientCount} active student${result.recipientCount === 1 ? "" : "s"}.`); setTitle(""); setBody(""); setReviewOpen(false); q.reload();
    } catch (error) { toast(error instanceof ApiError ? error.message : "Could not send the notification.", "error"); }
    finally { setBusy(false); }
  };
  return <><PageHeader title="Notifications" sub="Send an in-app announcement to active student accounts and review recent notification records." />
    <Card className="mb-5 max-w-2xl"><h2 className="font-bold">New announcement</h2><p className="mt-1 text-sm text-muted">Only active student accounts are included. External email, SMS, and push channels are not sent by this action.</p><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); setReviewOpen(true); }}>
      <Field label="Title">{(id) => <input id={id} maxLength={160} required className={inputCls} value={title} onChange={(event) => setTitle(event.target.value)} />}</Field>
      <Field label="Message">{(id) => <textarea id={id} maxLength={3000} minLength={3} required rows={4} className={inputCls} value={body} onChange={(event) => setBody(event.target.value)} />}</Field>
      <Button type="submit" disabled={busy}><Send size={15} />Review & send</Button>
    </form></Card>
    <Modal open={reviewOpen} title="Review announcement" onClose={() => { if (!busy) setReviewOpen(false); }}>
      <div className="space-y-4"><div className="overflow-hidden rounded-2xl border border-border bg-bg/60"><div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-muted"><Bell size={15} className="text-accent" aria-hidden="true" />In-app notification preview</div><div className="p-4"><h3 className="text-base font-bold break-words">{title.trim() || "Untitled announcement"}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text">{body.trim() || "No message content yet."}</p></div></div><p className="text-xs leading-5 text-muted">This message will be sent to every active student account. Review the content above before confirming.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={busy} onClick={() => setReviewOpen(false)}>Back to edit</Button><Button type="button" loading={busy} onClick={() => void send()}><Send size={15} />Send announcement</Button></div></div>
    </Modal>
    <Card><h2 className="mb-3 font-bold">Recent notifications</h2>{q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} /> : q.loading && !q.data ? <Skeleton className="h-56" /> : <DataTable rows={q.data ?? []} empty="No notification records are available." cols={[{ key: "title", label: "Title", render: (row) => row.title }, { key: "body", label: "Message", render: (row) => <span className="line-clamp-2 max-w-md">{row.body ?? "—"}</span> }, { key: "recipients", label: "Recipients", render: (row) => row.recipientCount.toLocaleString() }, { key: "channel", label: "Channel", render: (row) => row.channel }, { key: "type", label: "Type", render: (row) => row.type }, { key: "created", label: "Created", render: (row) => new Date(row.createdAt).toLocaleString() }]} />}</Card>
  </>;
}
export default function Page() { return DEMO ? <DemoNotificationsPage /> : <LiveNotificationsPage />; }
