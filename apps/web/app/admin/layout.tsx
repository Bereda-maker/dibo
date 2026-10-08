"use client";
import { AppShell } from "../../components/AppShell";
import { AdminGate } from "../../features/live/Pages";
import { DEMO } from "../../lib/config";
const demo = [["/admin", "Dashboard"], ["/admin/students", "Students"], ["/admin/content", "Subjects & Notes"], ["/admin/questions", "Question Bank"], ["/admin/exams", "Exams & Results"], ["/admin/ai", "AI Management"], ["/admin/subscriptions", "Subscriptions & Payments"], ["/admin/notifications", "Notifications"], ["/admin/analytics", "Analytics"], ["/admin/audit", "Audit Logs"], ["/admin/settings", "Settings"]] as const;
const live = [["/admin", "Dashboard"], ["/admin/students", "Students"], ["/admin/audit", "Audit Logs"]] as const;
export default function L({ children }: { children: React.ReactNode }) { return <AppShell admin items={DEMO ? demo : live}>{DEMO ? children : <AdminGate>{children}</AdminGate>}</AppShell>; }
