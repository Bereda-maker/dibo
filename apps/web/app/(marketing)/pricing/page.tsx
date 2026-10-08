"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Modal, useToast } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { formatBirr } from "../../../lib/mock";
export default function P() {
  const { state, update } = useStore(); const router = useRouter(); const toast = useToast(); const [pick, setPick] = useState<string | null>(null);
  const plans = state.plans; const sel = plans.find((p) => p.id === pick);
  return <div className="mx-auto max-w-6xl px-4 py-12"><h1 className="text-3xl font-bold">Pricing</h1><p className="mt-2 text-muted">Start free. Upgrade when you are ready for the full question bank and mock exams. Prices are set by Dibora and may change.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{plans.map((p) => <Card key={p.id} className={p.id === "annual" ? "ring-2 ring-accent" : ""}>
      <div className="flex items-center justify-between"><h2 className="font-bold">{p.name}</h2>{p.id === "annual" && <Badge tone="accent">Best value</Badge>}</div>
      <p className="mt-3 text-3xl font-extrabold text-primary">{formatBirr(p.priceMinor)}</p><ul className="mt-4 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />{f}</li>)}</ul>
      <Button className="mt-5 w-full" variant={p.priceMinor ? "primary" : "secondary"} onClick={() => p.priceMinor ? (state.user ? setPick(p.id) : router.push("/register")) : router.push(state.user ? "/dashboard" : "/register")} disabled={state.user?.plan === "PREMIUM" && p.priceMinor > 0}>{p.priceMinor ? (state.user?.plan === "PREMIUM" ? "Current plan" : "Upgrade") : "Start free"}</Button></Card>)}</div>
    <Modal open={!!sel} title="Confirm upgrade" onClose={() => setPick(null)}>
      <p className="text-sm">{sel?.name} — {sel && formatBirr(sel.priceMinor)}</p><p className="mt-2 rounded-xl bg-warning/15 p-3 text-xs text-warning">Demo mode: no real payment is taken. In production this opens the payment provider checkout and your plan activates only after the server verifies the payment.</p>
      <div className="mt-4 flex gap-2"><Button onClick={() => { update((s) => ({ ...s, user: s.user && { ...s.user, plan: "PREMIUM" } })); setPick(null); toast("Premium activated (demo)"); router.push("/dashboard"); }}>Continue (demo)</Button><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button></div></Modal></div>; }
