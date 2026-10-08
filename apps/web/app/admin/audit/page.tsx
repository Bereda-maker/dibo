"use client";
import { DEMO } from "../../../lib/config";
import { LiveAdminAudit } from "../../../features/live/Pages";
import { Card, PageHeader } from "../../../components/ui";
import { DataTable } from "../../../components/DataTable";
import { useStore } from "../../../lib/store";
function DemoP() { const { state } = useStore(); return <><PageHeader title="Audit logs" sub="Sensitive admin actions are recorded here." /><Card><DataTable rows={state.audit.map((a, i) => ({ id: String(i), ...a }))} empty="No admin actions recorded yet. Suspend a student or publish a question to see entries." cols={[{ key: "t", label: "When", render: (r) => new Date(r.at).toLocaleString() }, { key: "a", label: "Action", render: (r) => r.action }]} /></Card></>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveAdminAudit />; }
