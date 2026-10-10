"use client";
import { DEMO } from "../../../lib/config";
import { LivePricing } from "../../../features/live/Social";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Modal, useToast } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { formatBirr } from "../../../lib/mock";
import { MarketingPageHeader } from "../../../components/MarketingPageHeader";
function DemoPricing() {
  const { state, update } = useStore(); const router = useRouter(); const toast = useToast(); const [pick, setPick] = useState<string | null>(null);
  const plans = state.plans; const selected = plans.find((plan) => plan.id === pick);
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12"><MarketingPageHeader eyebrow="Plans that grow with you" title="Start free. Upgrade when you are ready." description="Build a steady study routine with the Free plan, then explore more practice and exam tools whenever you need them. Current prices and inclusions are shown below." />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{plans.map((plan) => <Card key={plan.id} className={plan.id === "annual" ? "ring-2 ring-accent" : ""}>
      <div className="flex items-center justify-between gap-2"><h2 className="font-bold">{plan.name}</h2>{plan.id === "annual" && <Badge tone="accent">Best value</Badge>}</div>
      <p className="mt-3 text-3xl font-extrabold text-primary">{formatBirr(plan.priceMinor)}</p><ul className="mt-4 space-y-2 text-sm">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{feature}</li>)}</ul>
      <Button className="mt-5 w-full" variant={plan.priceMinor ? "primary" : "secondary"} onClick={() => plan.priceMinor ? (state.user ? setPick(plan.id) : router.push("/login")) : router.push(state.user ? "/dashboard" : "/login")} disabled={state.user?.plan === "PREMIUM" && plan.priceMinor > 0}>{plan.priceMinor ? (state.user?.plan === "PREMIUM" ? "Current plan" : "Upgrade") : "Start free"}</Button>
    </Card>)}</div>
    <p className="mt-5 text-center text-sm leading-6 text-muted">Paid plan availability, payment instructions and verification details are shown in the app before you proceed.</p>
    <Modal open={!!selected} title="Confirm upgrade" onClose={() => setPick(null)}><p className="text-sm">{selected?.name} — {selected && formatBirr(selected.priceMinor)}</p><p className="mt-2 rounded-xl bg-warning/15 p-3 text-xs text-warning">Demo mode: no real payment is taken. In production, payment is verified before a plan is activated.</p><div className="mt-4 flex gap-2"><Button onClick={() => { update((current) => ({ ...current, user: current.user && { ...current.user, plan: "PREMIUM" } })); setPick(null); toast("Premium activated (demo)"); router.push("/dashboard"); }}>Continue (demo)</Button><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button></div></Modal>
  </div>;
}
export default function PricingPage() { return DEMO ? <DemoPricing /> : <LivePricing />; }
