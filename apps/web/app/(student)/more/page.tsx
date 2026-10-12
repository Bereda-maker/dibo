"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, XCircle, Search, Trophy, Medal, Bell, UserCircle, Crown, LogOut } from "lucide-react";
import { Badge, Card, PageHeader } from "../../../components/ui";
import { useStore } from "../../../lib/store";
import { useSession } from "../../../lib/session";
import { DEMO } from "../../../lib/config";
import { useStudentNotificationCountContext } from "../../../lib/useStudentNotificationCount";

const l = [["/progress", "Progress", Medal], ["/bookmarks", "My Bookmarks", Bookmark], ["/mistakes", "Questions I Got Wrong", XCircle], ["/search", "Search", Search], ["/achievements", "Achievements", Medal], ["/leaderboard", "Leaderboard", Trophy], ["/notifications", "Notifications", Bell], ["/profile", "Profile & privacy", UserCircle], ["/pricing", "Plans", Crown], ["/assistant", "AI Assistant", Bell]] as const;

export default function P() {
  const { logout: demoLogout } = useStore();
  const sess = useSession();
  const router = useRouter();
  const notificationCount = useStudentNotificationCountContext();
  const unread = notificationCount.count ?? 0;
  const logout = () => { if (DEMO) demoLogout(); else void sess.logout(); };

  return <><PageHeader title="More" />
    {notificationCount.error && <p role="status" className="mb-3 rounded-xl border border-warning/25 bg-warning/5 p-3 text-sm text-muted">Unread notification count is unavailable. <button type="button" className="ml-1 font-semibold text-primary underline" onClick={() => void notificationCount.reload()}>Retry</button></p>}
    <div className="space-y-2">{l.map(([href, label, Icon]) => {
      const hasUnread = href === "/notifications" && unread > 0;
      return <Link key={href} href={href} aria-label={hasUnread ? `Notifications, ${unread} unread notifications` : undefined}>
        <Card className="mb-2 flex items-center gap-3 !p-4"><Icon size={18} aria-hidden="true" /><span>{label}</span>{hasUnread && <Badge tone="info"><span aria-hidden="true">{unread.toLocaleString()}</span><span className="sr-only">{unread} unread notifications</span></Badge>}</Card>
      </Link>;
    })}<button onClick={() => { logout(); router.push("/"); }} className="flex min-h-[48px] w-full items-center gap-3 rounded-card border border-border p-4 text-left"><LogOut size={18} aria-hidden="true" />Log out</button></div>
  </>;
}
