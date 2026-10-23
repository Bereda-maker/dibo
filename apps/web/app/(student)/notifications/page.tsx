"use client";
import { useState } from "react";
import { DEMO } from "../../../lib/config";
import { LiveNotifications, NotificationDetailModal } from "../../../features/live/Social";
import { Bell } from "lucide-react";
import { Button, Card, PageHeader, cx } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { demoNotifications, type DemoNotification } from "../../../lib/studentNotifications";
function DemoP() {
  const { state, update } = useStore(); const items = demoNotifications(state); const [selected, setSelected] = useState<DemoNotification | null>(null);
  return <><PageHeader title="Notifications" action={<Button variant="secondary" onClick={() => update((s) => ({ ...s, readNotifs: demoNotifications(s).map((i) => i.id) }))}>Mark all read</Button>} />
    <div className="space-y-2">{items.map((n) => <Card key={n.id} className={cx("transition-opacity", state.readNotifs.includes(n.id) && "opacity-60")}><button type="button" onClick={() => { setSelected(n); if (!state.readNotifs.includes(n.id)) update((s) => ({ ...s, readNotifs: [...s.readNotifs, n.id] })); }} className="flex w-full gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"><Bell size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{n.title}</span>{!state.readNotifs.includes(n.id) && <span className="rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-semibold text-info">New</span>}</span><span className="mt-1 block line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted">{n.body}</span><span className="mt-2 inline-block text-xs font-bold text-primary">Read full message</span></span></button></Card>)}</div><NotificationDetailModal notification={selected} open={!!selected} onClose={() => setSelected(null)} /></>;
}

export default function Page() { return DEMO ? <DemoP /> : <LiveNotifications />; }
