"use client";
import { DEMO } from "../../../lib/config";
import { LiveLeaderboard } from "../../../features/live/Social";
import { useState } from "react";
import { Button, Card, PageHeader, cx } from "../../../components/ui";
import { LEADERBOARD } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
import { points } from "../../../lib/analytics";
function DemoP() {
  const { state, update } = useStore(); const u = state.user!; const [range, setRange] = useState("Weekly"); const mult = range === "Weekly" ? 0.25 : range === "Monthly" ? 0.6 : 1;
  const me = { name: u.name.split(" ")[0] + " (you)", points: Math.round(points(state) * (range === "Overall" ? 1 : 1)) };
  const rows = [...LEADERBOARD.map((r) => ({ ...r, points: Math.round(r.points * mult) })), ...(u.leaderboardOptIn ? [me] : [])].sort((a, b) => b.points - a.points);
  return <><PageHeader title="Leaderboard" sub="Optional and private by default. Only display names and points are shown." />
    <div className="mb-4 flex gap-2" role="group" aria-label="Period">{["Weekly", "Monthly", "Overall"].map((r) => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} className={cx("min-h-[44px] rounded-xl border px-4 text-sm", range === r ? "border-primary bg-primary text-white" : "border-border")}>{r}</button>)}</div>
    {!u.leaderboardOptIn && <Card className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">You are hidden from the leaderboard.</p><Button onClick={() => update((s) => ({ ...s, user: s.user && { ...s.user, leaderboardOptIn: true } }))}>Join leaderboard</Button></Card>}
    <Card><ol>{rows.map((r, i) => <li key={r.name} className={cx("flex items-center justify-between border-b border-border/60 py-3 last:border-0", r.name.includes("(you)") && "font-bold text-primary")}><span><span className="mr-3 inline-block w-6 text-muted">{i + 1}</span>{r.name}</span><span>{r.points} pts</span></li>)}</ol></Card>
    {u.leaderboardOptIn && <Button variant="ghost" className="mt-3" onClick={() => update((s) => ({ ...s, user: s.user && { ...s.user, leaderboardOptIn: false } }))}>Opt out of leaderboard</Button>}</>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveLeaderboard />; }
