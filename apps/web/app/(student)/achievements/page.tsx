"use client";
import { Award, Lock } from "lucide-react";
import { Card, PageHeader, cx } from "../../../components/ui";
import { ACHIEVEMENTS } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
import { unlocked } from "../../../lib/analytics";
export default function P() {
  const { state } = useStore(); const got = unlocked(state);
  return <><PageHeader title="Achievements" sub={`${got.size} of ${ACHIEVEMENTS.length} unlocked`} /><div className="grid gap-3 sm:grid-cols-2">{ACHIEVEMENTS.map((a) => { const ok = got.has(a.code); return <Card key={a.code} className={cx("flex items-center gap-4 !p-4", !ok && "opacity-60")}>{ok ? <Award className="text-accent" size={28} aria-hidden /> : <Lock size={28} className="text-muted" aria-hidden />}<div><p className="font-bold">{a.name}</p><p className="text-sm text-muted">{a.desc}</p><p className="sr-only">{ok ? "Unlocked" : "Locked"}</p></div></Card>; })}</div></>; }
