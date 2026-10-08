"use client";
import { DEMO } from "../../../lib/config";
import { LiveAdminStudents } from "../../../features/live/Pages";
import { useState } from "react";
import { Badge, Button, Card, Modal, PageHeader, Skeleton, inputCls } from "../../../components/ui";
import { DataTable } from "../../../components/DataTable";
import { useAdmin, type Student } from "../../../lib/admin";
function DemoP() {
  const { d, set } = useAdmin(); const [q, setQ] = useState(""); const [plan, setPlan] = useState("ALL"); const [view, setView] = useState<Student | null>(null); const [del, setDel] = useState<Student | null>(null);
  if (!d) return <Skeleton className="h-60" />;
  const rows = d.students.filter((s) => (plan === "ALL" || s.plan === plan) && (s.name + s.region).toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader title="Students" sub="Contact details and AI conversations are intentionally not shown here." />
    <div className="mb-3 flex flex-wrap gap-2"><input aria-label="Search students" placeholder="Search name or region" className={inputCls + " max-w-xs"} value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Plan" className={inputCls + " max-w-[160px]"} value={plan} onChange={(e) => setPlan(e.target.value)}><option value="ALL">All plans</option><option>FREE</option><option>PREMIUM</option></select></div>
    <Card><DataTable rows={rows} cols={[{ key: "n", label: "Name", render: (s) => s.name }, { key: "r", label: "Region", render: (s) => s.region }, { key: "l", label: "Learning", render: (s) => <Badge tone="info">{s.learning.replaceAll("_", " ")}</Badge> }, { key: "p", label: "Plan", render: (s) => <Badge tone={s.plan === "PREMIUM" ? "accent" : "muted"}>{s.plan}</Badge> }, { key: "a", label: "Accuracy", render: (s) => `${s.accuracy}%` }, { key: "acc", label: "Account", render: (s) => <Badge tone={s.active ? "success" : "error"}>{s.active ? "Active" : "Suspended"}</Badge> },
      { key: "x", label: "", render: (s) => <span className="flex flex-wrap gap-1"><Button variant="secondary" onClick={() => setView(s)}>View</Button><Button variant="secondary" onClick={() => set((x) => ({ ...x, students: x.students.map((y) => y.id === s.id ? { ...y, active: !y.active } : y) }), `${s.active ? "Suspended" : "Activated"} student ${s.id}`)}>{s.active ? "Suspend" : "Activate"}</Button><Button variant="danger" onClick={() => setDel(s)}>Delete</Button></span> }]} /></Card>
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <dl className="space-y-1 text-sm"><div>Region: {view.region}</div><div>Grade: {view.grade}</div><div>Learning status: {view.learning}</div><div>Subscription: {view.plan}</div><div>Accuracy: {view.accuracy}%</div><div>Exam readiness: {view.readiness}%</div><div>Joined: {view.joined}</div></dl>}</Modal>
    <Modal open={!!del} title="Delete student?" onClose={() => setDel(null)}><p className="text-sm">This is logged in the audit trail and removes the account (soft delete).</p><div className="mt-4 flex gap-2"><Button variant="danger" onClick={() => { if (del) set((x) => ({ ...x, students: x.students.filter((y) => y.id !== del.id) }), `Deleted student ${del.id}`); setDel(null); }}>Delete</Button><Button variant="secondary" onClick={() => setDel(null)}>Cancel</Button></div></Modal></>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveAdminStudents />; }
