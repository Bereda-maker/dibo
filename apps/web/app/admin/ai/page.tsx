"use client";
import { Card, PageHeader } from "../../../components/ui";
import { BarChart } from "../../../components/Charts";
export default function P() { return <><PageHeader title="AI management" sub="Provider settings live on the server. Keys are never shown here." />
  <div className="grid gap-4 md:grid-cols-2"><Card><h2 className="font-bold">Configuration</h2><dl className="mt-2 space-y-1 text-sm"><div>Provider endpoint: set via <code>AI_BASE_URL</code></div><div>Model: set via <code>AI_MODEL</code></div><div>API key: set via <code>AI_PROVIDER_API_KEY</code> (server only)</div><div>Free limit: 5 messages / day</div><div>Prompt-injection screening: on</div></dl></Card>
    <Card><h2 className="mb-3 font-bold">Usage (sample)</h2><BarChart label="AI usage by day" data={[["Mon", 40], ["Tue", 55], ["Wed", 62], ["Thu", 48], ["Fri", 70]].map(([l, v]) => ({ label: String(l), value: Number(v) }))} /></Card>
    <Card className="md:col-span-2"><h2 className="font-bold">Quality review queue</h2><p className="mt-1 text-sm text-muted">Answers where retrieval found no approved material appear here so your team can add content. Private student conversations are not shown to admins.</p></Card></div></>; }
