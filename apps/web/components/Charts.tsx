type P = { label: string; value: number };
export function LineChart({ data, height = 160, label }: { data: P[]; height?: number; label: string }) {
  if (data.length < 2) return <p className="text-sm text-muted">Not enough data yet.</p>;
  const w = 320, pad = 24, max = 100;
  const pts = data.map((d, i) => [pad + (i * (w - pad * 2)) / (data.length - 1), height - pad - (d.value / max) * (height - pad * 2)] as const);
  return (<figure><svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={label} className="w-full">
    {[0, 50, 100].map((g) => <g key={g}><line x1={pad} x2={w - pad} y1={height - pad - (g / max) * (height - pad * 2)} y2={height - pad - (g / max) * (height - pad * 2)} stroke="var(--border)" /><text x={0} y={height - pad - (g / max) * (height - pad * 2) + 3} fontSize="9" fill="var(--muted)">{g}</text></g>)}
    <polyline fill="none" stroke="var(--primary)" strokeWidth="2.5" points={pts.map((p) => p.join(",")).join(" ")} />
    {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--accent)"><title>{`${data[i]!.label}: ${data[i]!.value}%`}</title></circle>)}</svg>
    <figcaption className="sr-only">{data.map((d) => `${d.label} ${d.value}%`).join(", ")}</figcaption></figure>);
}
export function BarChart({ data, label }: { data: (P & { color?: string })[]; label: string }) {
  if (!data.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (<ul aria-label={label} className="space-y-3">{data.map((d) => (<li key={d.label}><div className="mb-1 flex justify-between text-sm"><span>{d.label}</span><span className="font-semibold">{d.value}%</span></div>
    <div className="h-3 rounded-full bg-border"><div className="h-3 rounded-full" style={{ width: `${d.value}%`, background: d.color ?? "var(--primary)" }} /></div></li>))}</ul>);
}
