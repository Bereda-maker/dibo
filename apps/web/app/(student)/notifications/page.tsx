"use client";
import { Bell } from "lucide-react";
import { Button, Card, PageHeader, cx } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { unlocked } from "../../../lib/analytics";
import { ACHIEVEMENTS } from "../../../lib/mock";
export default function P() {
  const { state, update } = useStore(); const u = state.user!; const diag = state.attempts.some((a) => a.type === "DIAGNOSTIC");
  const items = [!diag && { id: "diag", title: "Diagnostic assessment available", body: "Find your strong and weak topics." }, ...state.attempts.slice(-3).map((a) => ({ id: "res-" + a.id, title: "Exam result available", body: `${a.title}: ${Math.round(a.result.percentage)}%` })),
    ...[...unlocked(state)].map((c) => ({ id: "ach-" + c, title: "Achievement unlocked", body: ACHIEVEMENTS.find((a) => a.code === c)?.name ?? c })), { id: "remind", title: "Study reminder", body: "A short 15-minute session today keeps your momentum." },
    { id: "sub", title: u.plan === "PREMIUM" ? "Premium is active" : "Unlock Premium", body: u.plan === "PREMIUM" ? "Thanks for supporting your learning." : "Get the full question bank and mock exams." }].filter(Boolean) as { id: string; title: string; body: string }[];
  return <><PageHeader title="Notifications" action={<Button variant="secondary" onClick={() => update((s) => ({ ...s, readNotifs: items.map((i) => i.id) }))}>Mark all read</Button>} />
    <div className="space-y-2">{items.map((n) => <Card key={n.id} className={cx("flex gap-3 !p-4", state.readNotifs.includes(n.id) && "opacity-60")}><Bell size={18} className="mt-0.5 text-accent" aria-hidden /><div><p className="font-semibold">{n.title}</p><p className="text-sm text-muted">{n.body}</p></div></Card>)}</div></>; }
