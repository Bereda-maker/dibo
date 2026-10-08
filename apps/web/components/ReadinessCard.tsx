"use client";
import { useT } from "../lib/i18n";
type Props = { overall: number; parts: Record<string, number>; delta?: number };
export function ReadinessCard({ overall, parts, delta }: Props) {
  const t = useT();
  return (
    <section aria-label={t("readiness.label")} className="rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-sm text-muted">{t("readiness.label")}</p>
      <p className="mt-1 text-5xl font-bold text-primary">{overall}%</p>
      {delta !== undefined && <p className="text-sm text-success">{delta >= 0 ? "+" : ""}{delta}% this week</p>}
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {Object.entries(parts).map(([k, v]) => (
          <div key={k}><dt className="text-xs capitalize text-muted">{k}</dt>
            <dd><div className="h-2 rounded-full bg-border" role="progressbar" aria-label={k} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded-full bg-primary" style={{ width: `${v}%` }} /></div><span className="text-sm font-medium">{v}%</span></dd></div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted">{t("readiness.disclaimer")}</p>
    </section>
  );
}
