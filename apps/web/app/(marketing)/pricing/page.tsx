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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{plans.map((plan) => {
      const months = plan.interval === "MONTHLY" ? 1 : plan.interval === "QUARTERLY" ? 3 : plan.interval === "ANNUAL" ? 12 : 0;
      const monthly = plans.find((item) => item.interval === "MONTHLY");
      const regularPrice = months && monthly ? monthly.priceMinor * months : 0;
      const discount = regularPrice > plan.priceMinor ? Math.round((1 - plan.priceMinor / regularPrice) * 100) : 0;
      const features = plan.id === "quarterly" || plan.id === "annual" ? plans.find((item) => item.id === "monthly")?.features ?? plan.features : plan.features;
      return <Card key={plan.id} className={`relative overflow-hidden ${plan.id === "annual" || plan.id === "quarterly" ? "border-primary/30 shadow-md" : ""}`}>
      {discount > 0 && <div className="absolute right-0 top-0 rounded-bl-2xl bg-success px-3 py-1.5 text-xs font-extrabold text-white">SAVE {discount}%</div>}
      <div className="flex items-center justify-between gap-2 pr-16"><h2 className="font-bold">{plan.name}</h2>{plan.id === "annual" && <Badge tone="accent">Best value</Badge>}</div>
      <div className="mt-4 flex items-baseline gap-2"><p className="text-3xl font-extrabold text-primary">{formatBirr(plan.priceMinor)}</p>{months > 0 && <span className="text-sm text-muted">/{months === 1 ? "month" : months === 3 ? "3 months" : "year"}</span>}</div>
      {discount > 0 && <p className="mt-1 text-sm text-muted"><span className="line-through">{formatBirr(regularPrice)}</span><span className="ml-2 font-semibold text-success">Save {formatBirr(regularPrice - plan.priceMinor)}</span></p>}
      {months > 1 && <p className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">Just {formatBirr(Math.round(plan.priceMinor / months))} per month</p>}
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">Included features</p><ul className="mt-2 space-y-2 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{feature}</li>)}</ul>
      <Button className="mt-5 w-full" variant={plan.priceMinor ? "primary" : "secondary"} onClick={() => plan.priceMinor ? (state.user ? setPick(plan.id) : router.push("/login")) : router.push(state.user ? "/dashboard" : "/login")} disabled={state.user?.plan === "PREMIUM" && plan.priceMinor > 0}>{plan.priceMinor ? (state.user?.plan === "PREMIUM" ? "Current plan" : "Upgrade") : "Start free"}</Button>
    </Card>})}</div>
    <p className="mt-5 text-center text-sm leading-6 text-muted">Paid plan availability, payment instructions and verification details are shown in the app before you proceed.</p>
    <Modal open={!!selected} title="Confirm upgrade" onClose={() => setPick(null)}><p className="text-sm">{selected?.name} — {selected && formatBirr(selected.priceMinor)}</p><p className="mt-2 rounded-xl bg-warning/15 p-3 text-xs text-warning">Demo mode: no real payment is taken. In production, payment is verified before a plan is activated.</p><div className="mt-4 flex gap-2"><Button onClick={() => { update((current) => ({ ...current, user: current.user && { ...current.user, plan: "PREMIUM" } })); setPick(null); toast("Premium activated (demo)"); router.push("/dashboard"); }}>Continue (demo)</Button><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button></div></Modal>
  </div>;
}
export default function PricingPage() { return DEMO ? <DemoPricing /> : <LivePricing />; }
