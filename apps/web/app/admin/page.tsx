"use client";
import { Card, PageHeader, Skeleton } from "../../components/ui";
import { BarChart, LineChart } from "../../components/Charts";
import { useAdmin } from "../../lib/admin";
import { useStore } from "../../lib/store";
export default function P() {
  const { d } = useAdmin(); const { state } = useStore(); if (!d) return <Skeleton className="h-60" />;
  const prem = d.students.filter((s) => s.plan === "PREMIUM").length; const revenue = prem * 150;
  const kpi: [string, string | number][] = [["Total students", d.students.length], ["Active students", d.students.filter((s) => s.active).length], ["Premium", prem], ["Free", d.students.length - prem], ["Conversion", `${Math.round((prem / d.students.length) * 100)}%`], ["Revenue (ETB, sample)", revenue.toLocaleString()], ["Published questions", d.questions.filter((q) => q.status === "PUBLISHED").length], ["Audit events", state.audit.length]];
  return <><PageHeader title="Admin dashboard" sub="Sample data in demo mode. Connect the API for live figures." />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{kpi.map(([l, v]) => <Card key={l} className="!p-4"><p className="text-2xl font-bold text-primary">{v}</p><p className="text-xs text-muted">{l}</p></Card>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">New registrations (weekly)</h2><LineChart label="New registrations" data={[12, 18, 25, 31, 44, 52].map((v, i) => ({ label: `W${i + 1}`, value: v }))} /></Card><Card><h2 className="mb-3 font-bold">Most attempted subjects</h2><BarChart label="Most attempted subjects" data={[["Mathematics", 88], ["Physics", 71], ["Chemistry", 64], ["Biology", 52], ["English", 40]].map(([l, v]) => ({ label: String(l), value: Number(v) }))} /></Card></div></>; }
