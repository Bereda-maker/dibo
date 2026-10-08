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
  const q = useApi(() => api<Record<string, number>>("/admin/overview"));
  return <><PageHeader title="Admin dashboard" /><Async q={q}>{(o) => <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Students", o.students], ["Premium", o.premium], ["Exam attempts", o.attempts], ["AI messages", o.ai_messages]].map(([l, v]) => <Card key={String(l)} className="!p-4"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div>}</Async></>;
}
type St = { id: string; userId: string; name: string; region: string | null; grade: number; learningStatus: string; subscriptionStatus: string; active: boolean };
export function LiveAdminStudents() {
  const { role } = useSession(); const toast = useToast(); const [qs, setQs] = useState(""); const q = useApi(() => api<St[]>(`/admin/students?limit=50${qs ? `&q=${encodeURIComponent(qs)}` : ""}`), [qs]);
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); q.reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "error"); } };
  return <><PageHeader title="Students" sub="Contact details and AI conversations are intentionally not shown here." /><input aria-label="Search students" placeholder="Search name or region" className={inputCls + " mb-3 max-w-xs"} value={qs} onChange={(e) => setQs(e.target.value)} />
    <Async q={q}>{(rows) => <Card><DataTable rows={rows} cols={[{ key: "n", label: "Name", render: (s) => s.name }, { key: "r", label: "Region", render: (s) => s.region ?? "—" }, { key: "l", label: "Learning", render: (s) => <Badge tone="info">{s.learningStatus.replaceAll("_", " ")}</Badge> }, { key: "p", label: "Plan", render: (s) => s.subscriptionStatus }, { key: "a", label: "Account", render: (s) => <Badge tone={s.active ? "success" : "error"}>{s.active ? "Active" : "Suspended"}</Badge> },
      { key: "x", label: "", render: (s) => <span className="flex gap-1"><Button variant="secondary" onClick={() => act(() => api(`/admin/students/${s.userId}/status`, { method: "PATCH", body: { active: !s.active } }), s.active ? "Suspended" : "Activated")}>{s.active ? "Suspend" : "Activate"}</Button>{role === "SUPER_ADMIN" && <Button variant="danger" onClick={() => confirm(`Delete ${s.name}?`) && act(() => api(`/admin/students/${s.userId}`, { method: "DELETE" }), "Deleted")}>Delete</Button>}</span> }]} /></Card>}</Async></>;
}
type Audit = { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string };
export function LiveAdminAudit() {
  const q = useApi(() => api<Audit[]>("/admin/audit-logs"));
  return <><PageHeader title="Audit logs" /><Async q={q}>{(rows) => <Card><DataTable rows={rows} empty="No admin actions recorded yet." cols={[{ key: "t", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() }, { key: "a", label: "Action", render: (r) => r.action }, { key: "o", label: "Target", render: (r) => `${r.targetType ?? ""} ${r.targetId?.slice(0, 8) ?? ""}` }]} /></Card>}</Async></>;
}
const LIVE_ADMIN = ["/admin", "/admin/students", "/admin/audit"];
export function AdminGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (LIVE_ADMIN.includes(path)) return <>{children}</>;
  return <EmptyState title="This admin screen is not available in live mode yet" body="Content, question, exam, analytics and settings management are available through the Admin API for now (see the README). The student list, overview and audit log are live." action={<Button href="/admin">Back to dashboard</Button>} />;
}
