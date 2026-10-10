"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Download,
  FileQuestion,
  GraduationCap,
  Inbox,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, ErrorState, PageHeader, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";

type RangeDays = 7 | 30 | 90;
type TrendPoint = {
  date: string;
  label: string;
  newStudents: number;
  activeLearners: number;
  examAttempts: number;
  answers: number;
};
type Overview = {
  rangeDays: RangeDays;
  generatedAt: string;
  summary: {
    students: number;
    activeLearners: number;
    newStudents: number;
    premium: number;
    examAttempts: number;
    answers: number;
    aiRequests: number;
    unresolvedContacts: number;
    newContacts: number;
    suspendedStudents: number;
    publishedQuestions: number;
    draftQuestions: number;
  };
  trend: TrendPoint[];
  learningStages: { status: string; count: number }[];
  topSubjects: { subject: string; answers: number }[];
  recentActivity: { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string }[];
};

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];
const SERIES = [
  { key: "newStudents", label: "New students", color: "var(--primary)" },
  { key: "activeLearners", label: "Active learners", color: "var(--info)" },
  { key: "examAttempts", label: "Exam attempts", color: "var(--accent)" },
  { key: "answers", label: "Questions answered", color: "var(--secondary)" },
] as const;

function MetricCard({ label, value, detail, icon, iconTone }: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconTone: string;
}) {
  return (
    <Card className="relative overflow-hidden !p-4 transition-shadow hover:shadow-lg sm:!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${iconTone}`} aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{detail}</p>
      <span className="pointer-events-none absolute -bottom-6 -right-5 h-20 w-20 rounded-full bg-primary/5" aria-hidden="true" />
    </Card>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 720;
  const height = 270;
  const left = 42;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const values = points.flatMap((point) => SERIES.map(({ key }) => point[key]));
  const max = Math.max(1, ...values);
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const x = (index: number) => points.length <= 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth;
  const ticks = [...new Set([0, Math.round(max / 2), max])].sort((a, b) => b - a);
  const labelStride = Math.max(1, Math.ceil((points.length - 1) / 5));
  const hasActivity = values.some((value) => value > 0);

  return (
    <>
      {!hasActivity && <p className="mb-2 text-sm text-muted">No learning activity recorded in this period yet.</p>}
      <figure>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" role="img" aria-label={`Daily student and learning activity for the last ${points.length} days`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray={tick === 0 ? undefined : "3 5"} />
              <text x={left - 9} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{tick}</text>
            </g>
          ))}
          {SERIES.map((series) => {
            const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point[series.key]).toFixed(1)}`).join(" ");
            return (
              <g key={series.key}>
                <path d={path} fill="none" stroke={series.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((point, index) => (
                  <circle key={`${series.key}-${point.date}`} cx={x(index)} cy={y(point[series.key])} r="3" fill="var(--surface)" stroke={series.color} strokeWidth="2">
                    <title>{`${point.label} · ${series.label}: ${point[series.key]}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {points.map((point, index) => index % labelStride === 0 || index === points.length - 1 ? (
            <text key={point.date} x={x(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--muted)">{point.label}</text>
          ) : null)}
        </svg>
        <figcaption className="sr-only">{points.map((point) => `${point.label}: ${point.newStudents} new students, ${point.activeLearners} active learners, ${point.examAttempts} exam attempts, ${point.answers} questions answered`).join(". ")}</figcaption>
      </figure>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-hidden="true">
        {SERIES.map((series) => <span key={series.key} className="inline-flex items-center gap-2 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />{series.label}</span>)}
      </div>
    </>
  );
}

function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatTime(value: string) {
  const date = new Date(value);
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : date.toLocaleDateString();
}

function exportOverviewCsv(data: Overview) {
  const rows = [
    ["Date", "New students", "Active learners", "Exam attempts", "Questions answered"],
    ...data.trend.map((point) => [point.date, point.newStudents, point.activeLearners, point.examAttempts, point.answers]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `dibora-admin-overview-${data.rangeDays}d.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading admin dashboard">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}

export function AdminDashboard() {
  const [range, setRange] = useState<RangeDays>(30);
  const q = useApi<Overview>(() => api<Overview>(`/admin/overview?range=${range}`), [range]);
  const data = q.data;
  const summary = data?.summary;
  const stageTotal = data?.learningStages.reduce((total, stage) => total + stage.count, 0) ?? 0;
  const largestSubjectCount = Math.max(1, ...(data?.topSubjects.map((subject) => subject.answers) ?? []));
  const stageColors = ["bg-primary", "bg-info", "bg-accent", "bg-success", "bg-secondary", "bg-warning"];

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Dashboard date range" className="inline-flex rounded-xl border border-border bg-surface p-1">
        {RANGE_OPTIONS.map((days) => <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${range === days ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-bg"}`}>{days} days</button>)}
      </div>
      <button type="button" onClick={() => q.reload()} disabled={q.loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold transition hover:bg-bg disabled:opacity-60" aria-label="Refresh dashboard">
        <RefreshCw size={15} className={q.loading ? "animate-spin" : ""} aria-hidden="true" />Refresh
      </button>
      <button type="button" onClick={() => data && exportOverviewCsv(data)} disabled={!data} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold transition hover:bg-bg disabled:opacity-50">
        <Download size={15} aria-hidden="true" />Export CSV
      </button>
    </div>
  );

  return (
    <>
      <PageHeader title="Admin overview" sub="A live pulse on Dibora’s learning community and platform activity." action={controls} />
      {q.error && data && <p role="status" className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted">Refresh failed. Showing the last loaded dashboard data.</p>}
      {q.loading && !data ? <DashboardSkeleton /> : q.error && !data ? <ErrorState message={q.error.message || "Could not load dashboard metrics."} onRetry={q.reload} /> : data && summary ? <>
        <p className="mb-3 text-right text-xs text-muted">Updated {new Date(data.generatedAt).toLocaleString()}</p>
        <section aria-label="Platform key metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard label="Student accounts" value={summary.students} detail={`${summary.newStudents.toLocaleString()} joined in the selected period`} icon={<Users size={20} />} iconTone="bg-primary/10 text-primary" />
          <MetricCard label="Active learners" value={summary.activeLearners} detail={`Unique learners with study sessions in ${range} days`} icon={<Activity size={20} />} iconTone="bg-info/10 text-info" />
          <MetricCard label="Exam attempts" value={summary.examAttempts} detail={`Started in the selected ${range}-day period`} icon={<GraduationCap size={20} />} iconTone="bg-accent/15 text-warning" />
          <MetricCard label="Premium students" value={summary.premium} detail={`${summary.students ? Math.round((summary.premium / summary.students) * 100) : 0}% of student accounts`} icon={<ShieldCheck size={20} />} iconTone="bg-success/10 text-success" />
        </section>

        <section aria-label="Selected period activity" className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard label="New students" value={summary.newStudents} detail={`Joined in the last ${range} days`} icon={<Users size={19} />} iconTone="bg-primary/10 text-primary" />
          <MetricCard label="Questions answered" value={summary.answers} detail="Practice and exam answers recorded" icon={<BookOpen size={19} />} iconTone="bg-secondary/10 text-secondary" />
          <MetricCard label="AI prompts" value={summary.aiRequests} detail="Student messages to academic support" icon={<BrainCircuit size={19} />} iconTone="bg-info/10 text-info" />
          <MetricCard label="Open contact messages" value={summary.unresolvedContacts} detail={`${summary.newContacts.toLocaleString()} new and unread`} icon={<Inbox size={19} />} iconTone="bg-warning/10 text-warning" />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.85fr)]">
          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">Learning activity</h2><p className="mt-1 text-xs text-muted">Daily sign-ups, engaged learners, exams, and answers</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Last {range} days</span></div>
            <TrendChart points={data.trend} />
          </Card>

          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">Student journey</h2><p className="mt-1 text-xs text-muted">Current learning stage · all students</p></div><GraduationCap size={19} className="text-primary" aria-hidden="true" /></div>
            {stageTotal === 0 ? <p className="py-8 text-center text-sm text-muted">No student profiles yet.</p> : <div className="space-y-4">{data.learningStages.map((stage, index) => {
              const percent = Math.round((stage.count / stageTotal) * 100);
              return <div key={stage.status}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate">{formatLabel(stage.status)}</span><span className="shrink-0 text-xs text-muted">{stage.count.toLocaleString()} · {percent}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${stageColors[index % stageColors.length]}`} style={{ width: `${percent}%` }} /></div>
              </div>;
            })}</div>}
          </Card>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="font-bold">Most practiced subjects</h2><p className="mt-1 text-xs text-muted">Answers recorded in the selected period</p></div><BookOpen size={18} className="text-primary" aria-hidden="true" /></div>
            {data.topSubjects.length === 0 ? <p className="py-8 text-center text-sm text-muted">No subject activity in this period yet.</p> : <ol className="space-y-4">{data.topSubjects.map((subject, index) => <li key={subject.subject}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-bg text-xs font-bold text-muted">{index + 1}</span><span className="truncate font-medium">{subject.subject}</span></span><span className="shrink-0 text-xs text-muted">{subject.answers.toLocaleString()}</span></div>
              <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (subject.answers / largestSubjectCount) * 100)}%` }} /></div>
            </li>)}</ol>}
          </Card>

          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="font-bold">Needs attention</h2><p className="mt-1 text-xs text-muted">Operational signals from live records</p></div><AlertTriangle size={18} className="text-warning" aria-hidden="true" /></div>
            <div className="space-y-3">
              <Link href="/admin/contact" className="group flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-bg"><span className="flex items-center gap-3"><span className="rounded-lg bg-warning/10 p-2 text-warning"><Inbox size={17} aria-hidden="true" /></span><span><span className="block text-sm font-semibold">Open contact messages</span><span className="block text-xs text-muted">{summary.newContacts} new · {summary.unresolvedContacts} unresolved</span></span></span><ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" /></Link>
              <Link href="/admin/students" className="group flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-bg"><span className="flex items-center gap-3"><span className="rounded-lg bg-error/10 p-2 text-error"><ShieldCheck size={17} aria-hidden="true" /></span><span><span className="block text-sm font-semibold">Suspended accounts</span><span className="block text-xs text-muted">{summary.suspendedStudents} student accounts</span></span></span><ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" /></Link>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="flex items-center gap-3"><span className="rounded-lg bg-info/10 p-2 text-info"><FileQuestion size={17} aria-hidden="true" /></span><span><span className="block text-sm font-semibold">Question bank</span><span className="block text-xs text-muted">Published / draft</span></span></span><span className="shrink-0 text-xs font-semibold">{summary.publishedQuestions} / {summary.draftQuestions}</span></div>
            </div>
          </Card>

          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="font-bold">Recent admin activity</h2><p className="mt-1 text-xs text-muted">Latest recorded actions</p></div><Activity size={18} className="text-primary" aria-hidden="true" /></div>
            {data.recentActivity.length === 0 ? <p className="py-8 text-center text-sm text-muted">No admin actions recorded yet.</p> : <ol className="space-y-3">{data.recentActivity.map((item) => <li key={item.id} className="flex items-start gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{formatLabel(item.action)}</span><span className="block truncate text-xs text-muted">{item.targetType ? `${formatLabel(item.targetType)}${item.targetId ? ` · ${item.targetId.slice(0, 8)}` : ""}` : "Platform action"}</span></span>
              <time className="shrink-0 text-xs text-muted" dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{formatTime(item.createdAt)}</time>
            </li>)}</ol>}
            <Link href="/admin/audit" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">View audit log<ArrowRight size={15} aria-hidden="true" /></Link>
          </Card>
        </section>

        <section aria-label="Admin shortcuts" className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-4 shadow-card">
          <span className="mr-1 text-sm font-semibold">Quick actions</span>
          <Link href="/admin/students" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition hover:bg-bg"><Users size={15} aria-hidden="true" />Manage students</Link>
          <Link href="/admin/contact" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition hover:bg-bg"><Inbox size={15} aria-hidden="true" />Contact inbox</Link>
          <Link href="/admin/audit" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition hover:bg-bg"><Activity size={15} aria-hidden="true" />Audit log</Link>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted"><FileQuestion size={14} aria-hidden="true" />{summary.publishedQuestions.toLocaleString()} published questions</span>
        </section>
      </> : null}
    </>
  );
}
