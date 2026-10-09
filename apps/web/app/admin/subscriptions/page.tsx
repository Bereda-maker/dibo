"use client";
import { Badge, Card, PageHeader } from "../../../components/ui";
import { DataTable } from "../../../components/DataTable";
import { formatBirr } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
const pays = [{ id: "p1", user: "Selam T.", plan: "Monthly", amt: 15000, prov: "telebirr", st: "VERIFIED" }, { id: "p2", user: "Hana B.", plan: "Annual", amt: 120000, prov: "telebirr", st: "VERIFIED" }, { id: "p3", user: "Yonas K.", plan: "Quarterly", amt: 39000, prov: "cbe", st: "VERIFYING" }, { id: "p4", user: "Biruk A.", plan: "Monthly", amt: 15000, prov: "cbe-birr", st: "FAILED" }];
export default function P() { const { state } = useStore(); return <><PageHeader title="Subscriptions & payments" sub="Sample records. Payment status is always verified server-side by Verify.et." />
  <Card className="mb-4"><h2 className="mb-2 font-bold">Plans</h2><DataTable rows={state.plans} cols={[{ key: "n", label: "Plan", render: (p) => p.name }, { key: "i", label: "Interval", render: (p) => p.interval }, { key: "p", label: "Price", render: (p) => formatBirr(p.priceMinor) }]} /></Card>
  <Card><h2 className="mb-2 font-bold">Payments</h2><DataTable rows={pays} cols={[{ key: "u", label: "Student", render: (r) => r.user }, { key: "p", label: "Plan", render: (r) => r.plan }, { key: "a", label: "Amount", render: (r) => formatBirr(r.amt) }, { key: "pr", label: "Provider", render: (r) => r.prov }, { key: "s", label: "Status", render: (r) => <Badge tone={r.st === "VERIFIED" ? "success" : r.st === "PENDING" || r.st === "VERIFYING" ? "warning" : "error"}>{r.st}</Badge> }]} /></Card></>; }
