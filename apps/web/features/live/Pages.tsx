"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Badge, Button, Card, EmptyState, PageHeader, inputCls, useToast } from "../../components/ui";
import { DataTable } from "../../components/DataTable";
import { LiveNote } from "./Learn";
import { LiveExamPage, LiveResults, LiveReview } from "./Exams";
import { api, ApiError } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useSession } from "../../lib/session";
import { Async } from "./shared";
import { AdminDashboard } from "./AdminDashboard";
import { API_PREFIX } from "../../lib/config";
import { notifyAdminActionCountsChanged } from "../../lib/useAdminActionCounts";

export const LiveNoteRoute = () => <LiveNote id={useParams<{ id: string }>().id} />;
export const LiveExamRoute = () => <LiveExamPage examId={useParams<{ id: string }>().id} />;
export const LiveResultsRoute = () => <LiveResults id={useParams<{ id: string }>().id} />;
export const LiveReviewRoute = () => <LiveReview id={useParams<{ id: string }>().id} />;
export function LiveDiagnostic() {
  const router = useRouter(); const q = useApi(() => api<{ id: string; type: string }[]>("/exams"));
  useEffect(() => { const d = q.data?.find((e) => e.type === "DIAGNOSTIC"); if (d) router.replace(`/exams/${d.id}`); }, [q.data, router]);
  return <Async q={q}>{(l) => (l.some((e) => e.type === "DIAGNOSTIC") ? <p className="text-sm text-muted">Opening your assessment…</p> : <EmptyState title="No diagnostic assessment is published yet" action={<Button href="/dashboard">Back</Button>} />)}</Async>;
}

/* ---------- live admin (overview, students, audit) ---------- */
export function LiveAdminOverview() {
  return <AdminDashboard />;
}
type St = { id: string; userId: string; name: string; region: string | null; grade: number; learningStatus: string; subscriptionStatus: string; active: boolean };
export function LiveAdminStudents() {
  const { role } = useSession(); const toast = useToast(); const [qs, setQs] = useState(""); const [offset, setOffset] = useState(0); const pageSize = 25; const q = useApi(() => api<St[]>(`/admin/students?limit=${pageSize}&offset=${offset}${qs ? `&q=${encodeURIComponent(qs)}` : ""}`), [qs, offset]);
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); q.reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "error"); } };
  return <><PageHeader title="Students" sub="Contact details and AI conversations are intentionally not shown here." /><input aria-label="Search students" placeholder="Search name or region" className={inputCls + " mb-3 max-w-xs"} value={qs} onChange={(e) => { setQs(e.target.value); setOffset(0); }} />
    <Async q={q}>{(rows) => <><Card><DataTable rows={rows} empty="No students match this search." cols={[{ key: "n", label: "Name", render: (s) => s.name }, { key: "r", label: "Region", render: (s) => s.region ?? "—" }, { key: "l", label: "Learning", render: (s) => <Badge tone="info">{s.learningStatus.replaceAll("_", " ")}</Badge> }, { key: "p", label: "Plan", render: (s) => s.subscriptionStatus }, { key: "a", label: "Account", render: (s) => <Badge tone={s.active ? "success" : "error"}>{s.active ? "Active" : "Suspended"}</Badge> },
      { key: "x", label: "", render: (s) => <span className="flex gap-1"><Button variant="secondary" onClick={() => act(() => api(`/admin/students/${s.userId}/status`, { method: "PATCH", body: { active: !s.active } }), s.active ? "Suspended" : "Activated")}>{s.active ? "Suspend" : "Activate"}</Button>{role === "SUPER_ADMIN" && <Button variant="danger" onClick={() => confirm(`Delete ${s.name}?`) && act(() => api(`/admin/students/${s.userId}`, { method: "DELETE" }), "Deleted")}>Delete</Button>}</span> }]} /></Card><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted">Showing {rows.length ? offset + 1 : 0}–{offset + rows.length}</span><div className="flex gap-2"><Button variant="secondary" disabled={offset === 0 || q.loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</Button><Button variant="secondary" disabled={rows.length < pageSize || q.loading} onClick={() => setOffset(offset + pageSize)}>Next</Button></div></div></>}</Async></>;
}
type Audit = { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string };
export function LiveAdminAudit() {
  const q = useApi(() => api<Audit[]>("/admin/audit-logs"));
  return <><PageHeader title="Audit logs" /><Async q={q}>{(rows) => <Card><DataTable rows={rows} empty="No admin actions recorded yet." cols={[{ key: "t", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() }, { key: "a", label: "Action", render: (r) => r.action }, { key: "o", label: "Target", render: (r) => `${r.targetType ?? ""} ${r.targetId?.slice(0, 8) ?? ""}` }]} /></Card>}</Async></>;
}
type PaymentReview = { id: string; reference: string; amountMinor: number; currency: string; paymentMethod: string | null; transactionReference: string | null; status: string; reviewReason: string | null; submittedAt: string; studentName: string; email: string; phone: string | null };
export function LiveAdminPayments() {
  const q = useApi(() => api<PaymentReview[]>("/admin/payment-reviews")); const toast = useToast();
  const act = async (id: string, action: "approve" | "reject") => { try { await api(`/admin/payment-reviews/${id}/${action}`, { method: "POST", body: {} }); toast(action === "approve" ? "Payment approved and Premium activated" : "Payment rejected"); notifyAdminActionCountsChanged(); q.reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not update payment review", "error"); } };
  return <><PageHeader title="Payment reviews" sub="Receipts that Verify.et could not process are reviewed here. Approve only after confirming the amount, account and receipt details." /><Async q={q}>{(rows) => rows.length ? <div className="space-y-4">{rows.map((r) => <Card key={r.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{r.studentName}</h2><p className="text-sm text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p><p className="mt-2 text-sm">{r.currency} {(r.amountMinor / 100).toLocaleString("en-US")} · {r.paymentMethod ?? "Unknown method"}{r.transactionReference ? ` · ${r.transactionReference}` : ""}</p><p className="text-xs text-muted">Submitted {new Date(r.submittedAt).toLocaleString()} · Provider fallback: {r.reviewReason ?? "Unavailable"}</p></div><Badge tone="warning">Pending review</Badge></div><div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]"><img src={`${API_PREFIX}/admin/payment-reviews/${r.id}/receipt`} alt={`Receipt from ${r.studentName}`} className="max-h-56 w-full rounded-xl border border-border object-contain" /><div className="flex items-end gap-2"><Button onClick={() => void act(r.id, "approve")}>Approve payment</Button><Button variant="danger" onClick={() => void act(r.id, "reject")}>Reject</Button></div></div></Card>)}</div> : <EmptyState title="No payment reviews pending" body="Payments that Verify.et cannot process will appear here for manual confirmation." />}</Async></>;
}
const LIVE_ADMIN = ["/admin", "/admin/students", "/admin/contact", "/admin/audit", "/admin/diagnostics", "/admin/subscriptions", "/admin/content", "/admin/questions", "/admin/exams", "/admin/analytics", "/admin/notifications", "/admin/settings", "/admin/ai"];
export function AdminGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (LIVE_ADMIN.includes(path)) return <>{children}</>;
  return <EmptyState title="This module is not connected to live data yet" body="This route is present for the admin experience, but its live backend workflow is not implemented. No sample records or simulated actions are shown. Live modules include the dashboard, student directory, curriculum, question bank, exams and results, diagnostics, learning analytics, plan pricing, notification history, contact inbox, payment reviews, AI configuration guidance, and audit log." action={<Button href="/admin">Back to dashboard</Button>} />;
}
