"use client";
import { DEMO } from "../../../lib/config";
import { LiveNotifications } from "../../../features/live/Social";
import { Bell } from "lucide-react";
import { Button, Card, PageHeader, cx } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { demoNotifications } from "../../../lib/studentNotifications";
function DemoP() {
  const { state, update } = useStore(); const items = demoNotifications(state);
  return <><PageHeader title="Notifications" action={<Button variant="secondary" onClick={() => update((s) => ({ ...s, readNotifs: demoNotifications(s).map((i) => i.id) }))}>Mark all read</Button>} />
    <div className="space-y-2">{items.map((n) => <Card key={n.id} className={cx("flex gap-3 !p-4", state.readNotifs.includes(n.id) && "opacity-60")}><Bell size={18} className="mt-0.5 text-accent" aria-hidden /><div><p className="font-semibold">{n.title}</p><p className="text-sm text-muted">{n.body}</p></div></Card>)}</div></>; }

export default function Page() { return DEMO ? <DemoP /> : <LiveNotifications />; }
