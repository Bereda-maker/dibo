"use client";
import { Card, PageHeader } from "../../../components/ui";
import { BarChart, LineChart } from "../../../components/Charts";
import { DataTable } from "../../../components/DataTable";
export default function P() { return <><PageHeader title="Analytics" sub="Sample data in demo mode." />
  <div className="grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">Retention (weekly cohorts)</h2><LineChart label="Retention" data={[100, 68, 52, 44, 41, 38].map((v, i) => ({ label: `W${i}`, value: v }))} /></Card>
    <Card><h2 className="mb-3 font-bold">Most difficult topics</h2><BarChart label="Lowest accuracy topics" data={[["Mechanics", 48], ["Calculus", 52], ["Stoichiometry", 57], ["Genetics", 61]].map(([l, v]) => ({ label: String(l), value: Number(v), color: "var(--warning)" }))} /></Card>
    <Card><h2 className="mb-3 font-bold">Funnel</h2><BarChart label="Funnel" data={[["Registered", 100], ["Diagnostic done", 72], ["Weekly active", 46], ["Premium", 12]].map(([l, v]) => ({ label: String(l), value: Number(v) }))} /></Card>
    <Card><h2 className="mb-2 font-bold">Frequently missed questions</h2><DataTable rows={[{ id: "1", q: "log₂(x) + log₂(x−2) = 3", m: "71%" }, { id: "2", q: "Highest point acceleration", m: "64%" }, { id: "3", q: "Moles in 3 mol O₂ reaction", m: "58%" }]} cols={[{ key: "q", label: "Question", render: (r) => r.q }, { key: "m", label: "Missed", render: (r) => r.m }]} /></Card></div></>; }
