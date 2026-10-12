"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Briefcase, CalendarDays, Coffee, GraduationCap, Heart, PiggyBank, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { Card, EmptyState, PageHeader, Skeleton, inputCls } from "../../components/ui";
import { useSession } from "../../lib/session";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
type OwnerPlanKey = "essential" | "reinvestment" | "emergency" | "longTerm" | "learning" | "enjoyment";

type FinanceAllocation = { key: OwnerPlanKey; sharePercent: number; amountMinor: number };
type FinanceCurrency = { currency: string; verifiedPaymentCount: number; grossMinor: number; godMinor: number; ownerMinor: number; ownerAllocations: FinanceAllocation[] };
type FinanceOverview = { month: string; timeZone: string; currencies: FinanceCurrency[] };

const categories: { key: OwnerPlanKey; title: string; percent: number; icon: typeof Wallet; accent: string; items: string[] }[] = [
  { key: "essential", title: "Essential living expenses", percent: 30, icon: Wallet, accent: "#173F32", items: ["Rent and housing", "Food and groceries", "Transportation and fuel", "Electricity and water bills", "Mobile data and internet", "Personal hygiene products", "Necessary clothing", "Basic medical expenses"] },
  { key: "reinvestment", title: "Business reinvestment", percent: 30, icon: Briefcase, accent: "#28664F", items: ["Website domain and hosting", "Software subscriptions and digital tools", "Marketing and advertising", "Computer equipment and accessories", "Product development and testing", "Customer acquisition", "Hiring freelancers or employees", "Business supplies and operating expenses"] },
  { key: "emergency", title: "Emergency savings", percent: 15, icon: PiggyBank, accent: "#B7791F", items: ["Unexpected medical expenses", "Emergency housing costs", "Temporary loss of income", "Laptop or equipment repairs", "Essential bills during slow business periods", "Unexpected business emergencies"] },
  { key: "longTerm", title: "Long-term investments", percent: 10, icon: TrendingUp, accent: "#3675B9", items: ["Regulated savings products", "Fixed-term deposits", "Diversified investment funds", "Retirement savings", "Other suitable long-term investment opportunities"] },
  { key: "learning", title: "Learning and skill development", percent: 10, icon: GraduationCap, accent: "#6B4BB1", items: ["Programming and software development courses", "Business and finance books", "Digital marketing training", "Communication and negotiation skills", "Professional certifications", "Mentorship and workshops", "Technical training and practical projects"] },
  { key: "enjoyment", title: "Personal enjoyment", percent: 5, icon: Coffee, accent: "#8A3B6E", items: ["Coffee and occasional meals out", "Entertainment and hobbies", "Social activities", "Personal shopping", "Gifts for family and friends", "Leisure activities and relaxation"] },
];

function currentMonthEAT() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}
function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1 + offset, 15));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year!, month! - 1, 15)));
}
function money(minor: number, currency: string) {
  const amount = minor / 100;
  try { return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}
function monthStep(month: string, offset: number, setMonth: (value: string) => void, label: string, disabled = false) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={() => setMonth(shiftMonth(month, offset))} className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"><span className="sr-only">{label}</span>{offset < 0 ? <ArrowLeft size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}</button>;
}
function FinanceSkeleton() {
  return <div className="space-y-6" aria-busy="true" aria-label="Loading finance overview"><div className="flex items-end justify-between gap-4"><div className="space-y-2"><Skeleton className="h-8 w-60" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-11 w-44" /></div><Skeleton className="h-52 w-full rounded-3xl" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><div className="grid gap-4 xl:grid-cols-2">{categories.map((item) => <Skeleton key={item.key} className="h-64" />)}</div></div>;
}

export function LiveAdminFinance() {
  const { role, ready } = useSession();
  if (!ready) return <FinanceSkeleton />;
  if (role !== "SUPER_ADMIN") return <EmptyState title="Super-admin access required" body="This financial planning view is restricted to the super-admin account." />;
  return <FinanceDataView />;
}

function FinanceDataView() {
  const [month, setMonth] = useState(currentMonthEAT);
  const q = useApi(() => api<FinanceOverview>(`/admin/finance?month=${encodeURIComponent(month)}`), [month]);
  if (q.error) return <div className="space-y-5"><PageHeader title="Revenue & monthly plan" sub="Verified revenue allocation for your business." /><Card><p role="alert" className="font-semibold text-error">Could not load the finance overview.</p><button type="button" onClick={q.reload} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Try again</button></Card></div>;
  const finance = q.data;
  if (q.loading || !finance) return <FinanceSkeleton />;

  const currencyRows: FinanceCurrency[] = finance.currencies.length ? finance.currencies : [{ currency: "ETB", verifiedPaymentCount: 0, grossMinor: 0, godMinor: 0, ownerMinor: 0, ownerAllocations: categories.map((category) => ({ key: category.key, sharePercent: category.percent, amountMinor: 0 })) }];
  const reportingEnd = shiftMonth(month, 1);
  const thisMonth = currentMonthEAT();

  return <div className="space-y-6">
    <PageHeader title="Revenue & monthly plan" sub="A clear, values-led view of verified revenue and your monthly allocation plan." action={<div className="flex items-center gap-2">{monthStep(month, -1, setMonth, "Previous month")}<label className="relative"><span className="sr-only">Choose reporting month</span><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input type="month" aria-label="Choose reporting month" value={month} max={thisMonth} onChange={(event) => event.target.value && setMonth(event.target.value)} className={`${inputCls} w-[185px] pl-9`} /></label>{monthStep(month, 1, setMonth, "Next month", month >= thisMonth)}</div>} />

    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-primary via-primary to-secondary p-5 text-white shadow-lg sm:p-8" aria-labelledby="stewardship-heading">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.06]" />
      <div className="relative grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90"><Sparkles size={14} className="text-accent" aria-hidden="true" /> MONTHLY STEWARDSHIP <span className="text-white/40">·</span> {monthLabel(month).toUpperCase()}</div><h2 id="stewardship-heading" className="mt-5 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Give every birr a thoughtful purpose.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Start with gratitude, then plan the remainder with intention and room for the unexpected.</p>
          <div className="mt-6 flex flex-wrap gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/60">Verified payments</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{currencyRows.reduce((sum, row) => sum + row.verifiedPaymentCount, 0).toLocaleString()}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/60">Period</p><p className="mt-1 text-2xl font-extrabold">{monthLabel(month)}</p></div></div>
        </div>
        <blockquote className="relative rounded-3xl border border-white/15 bg-white/[0.09] p-5 sm:p-6"><div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-accent/20 text-accent"><BookOpen size={21} aria-hidden="true" /></div><p className="text-lg font-semibold leading-7 sm:text-xl">“Honour the Lord with thy substance, and with the firstfruits of all thine increase.”</p><footer className="mt-3 text-sm font-bold text-accent">Proverbs 3:9 · King James Version</footer><p className="mt-4 border-t border-white/15 pt-3 text-xs leading-5 text-white/65">A planning reminder: this dashboard earmarks amounts; it does not make donations or move money.</p></blockquote>
      </div>
    </section>

    {currencyRows.map((row) => <section key={row.currency} className="space-y-4" aria-labelledby={`currency-${row.currency}`}>
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Monthly ledger · {finance.timeZone === "Africa/Addis_Ababa" ? "East Africa Time" : finance.timeZone}</p><h2 id={`currency-${row.currency}`} className="mt-1 text-xl font-extrabold tracking-tight">{row.currency} allocation</h2></div><p className="text-xs text-muted">{row.verifiedPaymentCount.toLocaleString()} verified {row.verifiedPaymentCount === 1 ? "payment" : "payments"} · {monthLabel(month)}</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.05] to-surface"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted">Verified revenue</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Wallet size={18} aria-hidden="true" /></span></div><p className="mt-4 break-words text-2xl font-extrabold tracking-tight text-text tabular-nums sm:text-3xl">{money(row.grossMinor, row.currency)}</p><p className="mt-2 text-xs text-muted">Payments verified during {monthLabel(month)}</p></Card>
        <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/15 to-surface"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted">Set aside for God · 10%</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/20 text-warning"><Heart size={18} aria-hidden="true" /></span></div><p className="mt-4 break-words text-2xl font-extrabold tracking-tight text-text tabular-nums sm:text-3xl">{money(row.godMinor, row.currency)}</p><p className="mt-2 text-xs text-muted">10% of total verified revenue</p></Card>
        <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.05] to-surface"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted">Your monthly plan · 90%</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={18} aria-hidden="true" /></span></div><p className="mt-4 break-words text-2xl font-extrabold tracking-tight text-text tabular-nums sm:text-3xl">{money(row.ownerMinor, row.currency)}</p><p className="mt-2 text-xs text-muted">Distributed across six planning buckets</p></Card>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-border" role="img" aria-label="Revenue split: 10 percent set aside for God and 90 percent allocated to your plan"><div className="h-full bg-accent" style={{ width: "10%" }} /><div className="h-full bg-primary" style={{ width: "90%" }} /></div><div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent" />10% stewardship</span><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />90% personal/business plan</span></div>

      <div className="flex flex-wrap items-end justify-between gap-2 pt-2"><div><h3 className="text-lg font-extrabold">Your 90% spending plan</h3><p className="mt-1 text-sm text-muted">Each percentage below is of your share; amounts are rounded so the plan totals exactly.</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">100% of your share</span></div>
      <div className="grid gap-4 xl:grid-cols-2">{categories.map((category) => {
        const allocation = row.ownerAllocations.find((item) => item.key === category.key);
        const Icon = category.icon;
        const amountMinor = allocation?.amountMinor ?? 0;
        const grossPercent = category.percent * 0.9;
        return <Card key={category.key} className="group transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${category.accent}14`, color: category.accent }}><Icon size={21} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold leading-5">{category.title}</h4><p className="mt-1 text-xs text-muted">{category.percent}% of your 90% share · {Number.isInteger(grossPercent) ? grossPercent.toFixed(0) : grossPercent.toFixed(1)}% of gross</p></div><p className="shrink-0 text-right text-lg font-extrabold tabular-nums">{money(amountMinor, row.currency)}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${category.percent}%`, backgroundColor: category.accent }} /></div></div></div><ul className="mt-4 grid gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs leading-5 text-muted sm:grid-cols-2">{category.items.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.accent }} />{item}</li>)}</ul></Card>;
      })}</div>
    </section>)}

    <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 text-xs leading-5 text-muted"><p className="font-bold text-text">How to read this view</p><p className="mt-1">Revenue includes only payments marked <strong>VERIFIED</strong>, grouped by currency and by their verification date in East Africa Time. No currency conversion is performed. This is an allocation plan, not a bank balance or accounting statement; it does not initiate transfers, charitable gifts, savings, investments, purchases, or tax filings. The monthly period ends at the start of {monthLabel(reportingEnd)} in East Africa Time.</p></div>
  </div>;
}
