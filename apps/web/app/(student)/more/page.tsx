"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, XCircle, Search, Trophy, Medal, Bell, UserCircle, Crown, LogOut } from "lucide-react";
import { Card, PageHeader } from "../../../components/ui";
import { useStore } from "../../../lib/store";
const l = [["/progress", "Progress", Medal], ["/bookmarks", "My Bookmarks", Bookmark], ["/mistakes", "Questions I Got Wrong", XCircle], ["/search", "Search", Search], ["/achievements", "Achievements", Medal], ["/leaderboard", "Leaderboard", Trophy], ["/notifications", "Notifications", Bell], ["/profile", "Profile & privacy", UserCircle], ["/pricing", "Plans", Crown], ["/assistant", "AI Assistant", Bell]] as const;
export default function P() { const { logout } = useStore(); const r = useRouter(); return <><PageHeader title="More" /><div className="space-y-2">{l.map(([h, t, I]) => <Link key={h} href={h}><Card className="mb-2 flex items-center gap-3 !p-4"><I size={18} aria-hidden />{t}</Card></Link>)}<button onClick={() => { logout(); r.push("/"); }} className="flex min-h-[48px] w-full items-center gap-3 rounded-card border border-border p-4 text-left"><LogOut size={18} aria-hidden />Log out</button></div></>; }
