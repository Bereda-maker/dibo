import { features } from "../page";
export const metadata = { title: "Features" };
export default function P() { return <div className="mx-auto max-w-6xl px-4 py-12"><h1 className="text-3xl font-bold">Features</h1><p className="mt-2 text-muted">Everything connects: learning, practice, assessment, analytics and AI.</p>
  <div className="mt-8 grid gap-4 sm:grid-cols-2">{features.map(([I, t, d]) => <div key={t} className="flex gap-4 rounded-card border border-border bg-surface p-5"><I className="mt-1 shrink-0 text-primary" size={24} aria-hidden /><div><h2 className="font-semibold">{t}</h2><p className="text-sm text-muted">{d}</p></div></div>)}</div></div>; }
