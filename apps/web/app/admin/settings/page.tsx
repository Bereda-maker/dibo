"use client";
import { useState } from "react";
import { Button, Card, Field, PageHeader, inputCls, useToast } from "../../../components/ui";
import { useStore } from "../../../lib/store";
export default function P() {
  const { state, update } = useStore(); const toast = useToast(); const [plans, setPlans] = useState(state.plans);
  return <><PageHeader title="Settings" sub="Plan prices are configuration, not code. Amounts are in santim (100 = ETB 1)." />
    <Card><h2 className="font-bold">Plans & pricing</h2><div className="mt-3 space-y-3">{plans.map((p, i) => <div key={p.id} className="grid gap-3 sm:grid-cols-2"><Field label={`${p.interval} plan name`}>{(id) => <input id={id} className={inputCls} value={p.name} onChange={(e) => setPlans(plans.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />}</Field>
      <Field label={`${p.interval} price (santim)`}>{(id) => <input id={id} type="number" min={0} className={inputCls} value={p.priceMinor} onChange={(e) => setPlans(plans.map((x, j) => j === i ? { ...x, priceMinor: Math.max(0, Number(e.target.value)) } : x))} />}</Field></div>)}</div>
      <Button className="mt-4" onClick={() => { update((s) => ({ ...s, plans, audit: [{ at: new Date().toISOString(), action: "Updated plan pricing" }, ...s.audit] })); toast("Pricing saved — see the public pricing page"); }}>Save pricing</Button></Card></>; }
